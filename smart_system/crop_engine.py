"""
Crop Recommendation Engine — Smart Agriculture System v2.0
=============================================================
Loads the trained ensemble model and recommends the best crop
based on soil and weather conditions with feature engineering.

Features
--------
    • Embedded feature engineering (mirrors feature_utils.py)
    • 7 raw features → 21 engineered features
    • Top-K crop predictions with probability scores
    • Input range validation
    • Corrupted model detection
    • Professional error handling and logging

Author  : Smart Agriculture AI Team
Version : 2.0.0
"""

from __future__ import annotations

import os
import time
from typing import Dict, List, Optional, Tuple

from . import config
from . import logger
from .gemini_advisor import generate_crop_advice


def _engineer_features(df) -> 'pd.DataFrame':
    """
    Apply feature engineering transformations.

    Mirrors the logic in ``crop_model/scripts/feature_utils.py``
    exactly to ensure training–inference consistency.

    Parameters
    ----------
    df : pd.DataFrame
        DataFrame with 7 raw columns.

    Returns
    -------
    pd.DataFrame
        DataFrame with 21 engineered features.
    """
    import numpy as np

    df = df.copy()

    # Nutrient Ratios
    df['N_P_ratio']  = df['Nitrogen'] / (df['Phosphorus'] + 1e-5)
    df['N_K_ratio']  = df['Nitrogen'] / (df['Potassium'] + 1e-5)
    df['P_K_ratio']  = df['Phosphorus'] / (df['Potassium'] + 1e-5)

    # Log Transforms
    df['log_rainfall'] = np.log1p(df['Rainfall'])
    df['log_humidity'] = np.log1p(df['Humidity'])

    # Interaction Features
    df['temp_humidity']     = df['Temperature'] * df['Humidity']
    df['temp_rainfall']     = df['Temperature'] * df['Rainfall']
    df['humidity_rainfall'] = df['Humidity'] * df['Rainfall']

    # Composite Soil Index
    df['soil_index'] = (
        df['Nitrogen'] * df['Phosphorus'] * df['Potassium']
    ) / 1000.0

    # Stress Indicators
    df['heat_stress']    = (df['Temperature'] > 32).astype(int)
    df['drought_stress'] = (df['Rainfall'] < 80).astype(int)

    # Soil pH Categories
    df['acidic_soil']   = (df['pH'] < 6).astype(int)
    df['neutral_soil']  = (
        (df['pH'] >= 6) & (df['pH'] <= 7.5)).astype(int)
    df['alkaline_soil'] = (df['pH'] > 7.5).astype(int)

    return df


# Expected feature column order (must match training)
FEATURE_COLUMNS: List[str] = [
    'Nitrogen', 'Phosphorus', 'Potassium',
    'Temperature', 'Humidity', 'pH', 'Rainfall',
    'N_P_ratio', 'N_K_ratio', 'P_K_ratio',
    'log_rainfall', 'log_humidity',
    'temp_humidity', 'temp_rainfall', 'humidity_rainfall',
    'soil_index',
    'heat_stress', 'drought_stress',
    'acidic_soil', 'neutral_soil', 'alkaline_soil'
]


class CropEngine:
    """
    Crop Recommendation Engine.

    Loads the trained ensemble model (RandomForest + XGBoost
    + LightGBM voting classifier) and provides crop
    recommendation with probability scores.

    Attributes
    ----------
    model : sklearn estimator or None
        The loaded ensemble model.
    label_encoder : LabelEncoder or None
        Encoder for crop class names.
    _loaded : bool
        Whether the model has been loaded successfully.
    """

    def __init__(self) -> None:
        self.model = None
        self.label_encoder = None
        self._loaded: bool = False
        self._num_crops: int = 0
        self._voter = None                       # fitted VotingClassifier
        self.weights: Dict[str, float] = dict(config.CROP_ENSEMBLE_WEIGHTS)

    # ── Ensemble weights ─────────────────────────────────────
    def set_weights(self, weights: Dict[str, float]) -> Dict[str, float]:
        """
        Set soft-voting weights (keys: rf, xgb, lgb). They are normalised
        to sum to 1 and used by every subsequent predict() call.
        """
        keys = {name for name, _ in self._voter.estimators}
        if set(weights) != keys:
            raise ValueError(f"weights must have exactly the keys {sorted(keys)}")
        if any(w < 0 for w in weights.values()) or sum(weights.values()) <= 0:
            raise ValueError("weights must be non-negative with a positive sum")
        total = float(sum(weights.values()))
        self.weights = {k: float(v) / total for k, v in weights.items()}
        logger.log_info("CROP", f"Ensemble weights set: {self.weights}")
        return dict(self.weights)

    def describe(self) -> Dict:
        """Static description of the loaded model (for /health, /ml/status)."""
        return {
            'loaded':  self._loaded,
            'type':    'RF + XGBoost + LightGBM (calibrated soft-voting)',
            'members': {
                name: type(getattr(est, 'estimator', est)).__name__
                for name, est in (self._voter.estimators if self._voter else [])
            } if self._voter else {},
            'weights': dict(self.weights),
            'n_classes': self._num_crops,
            'n_features': len(FEATURE_COLUMNS),
        }

    def load(self) -> bool:
        """
        Load the crop recommendation model and label encoder.

        Returns
        -------
        bool
            True if model loaded successfully.
        """
        try:
            import joblib
        except ImportError:
            logger.log_error(
                "CROP", "Missing dependency: joblib. "
                "Install: pip install joblib")
            return False

        load_start = time.time()

        try:
            # Validate model file
            if not os.path.isfile(config.CROP_MODEL_PATH):
                logger.log_error(
                    "CROP",
                    f"Model file not found: {config.CROP_MODEL_PATH}")
                return False

            if not os.path.isfile(config.CROP_ENCODER_PATH):
                logger.log_error(
                    "CROP",
                    f"Encoder not found: {config.CROP_ENCODER_PATH}")
                return False

            # Check for corrupted files
            for path, name in [(config.CROP_MODEL_PATH, "Model"),
                               (config.CROP_ENCODER_PATH, "Encoder")]:
                fsize = os.path.getsize(path)
                if fsize < 512:
                    logger.log_error(
                        "CROP",
                        f"{name} file appears corrupted ({fsize} bytes)")
                    return False

            self.model = joblib.load(config.CROP_MODEL_PATH)
            self.label_encoder = joblib.load(config.CROP_ENCODER_PATH)

            self._num_crops = len(self.label_encoder.classes_)

            # Locate the fitted VotingClassifier so each member's
            # probabilities can be combined with the configured weights.
            voter = (self.model.named_steps['model']
                     if hasattr(self.model, 'named_steps') else self.model)
            if not hasattr(voter, 'estimators_'):
                raise RuntimeError(
                    "Crop model is not a fitted VotingClassifier")
            self._voter = voter

            # Feature-order guard: inference columns must equal training.
            trained = getattr(self.model, 'feature_names_in_', None)
            if trained is not None and list(trained) != FEATURE_COLUMNS:
                raise RuntimeError(
                    "Inference feature order differs from training: "
                    f"{list(trained)} != {FEATURE_COLUMNS}")
            self._loaded = True

            elapsed = time.time() - load_start
            logger.log_model_load("CROP", True, elapsed)
            logger.log_info(
                "CROP",
                f"Loaded: {self._num_crops} crop classes")
            return True

        except Exception as e:
            logger.log_error(
                "CROP", f"Failed to load model: {str(e)}")
            return False

    def predict(
        self,
        N: float, P: float, K: float,
        temperature: float, humidity: float,
        ph: float, rainfall: float,
        top_k: int = 5
    ) -> Dict:
        """
        Recommend the best crop based on soil and weather.

        Parameters
        ----------
        N : float
            Nitrogen level (kg/ha).
        P : float
            Phosphorus level (kg/ha).
        K : float
            Potassium level (kg/ha).
        temperature : float
            Temperature (°C).
        humidity : float
            Humidity (%).
        ph : float
            Soil pH.
        rainfall : float
            Rainfall (mm).
        top_k : int
            Number of top predictions to return.

        Returns
        -------
        dict
            success         : bool
            crop_name       : str
            confidence      : float (percentage)
            top_predictions : list[(crop, confidence)]
            input_data      : dict of raw inputs
            error           : str (only if success is False)
        """
        if not self._loaded:
            return {
                'success': False,
                'error': 'Crop model not loaded. Call load() first.'
            }

        input_data = {
            'N': N, 'P': P, 'K': K,
            'Temperature': temperature,
            'Humidity': humidity,
            'pH': ph,
            'Rainfall': rainfall,
        }

        try:
            import numpy as np
            import pandas as pd

            # Build feature DataFrame
            data = pd.DataFrame([{
                'Nitrogen':    N,
                'Phosphorus':  P,
                'Potassium':   K,
                'Temperature': temperature,
                'Humidity':    humidity,
                'pH':          ph,
                'Rainfall':    rainfall,
            }])

            # Apply feature engineering
            data = _engineer_features(data)
            data = data[FEATURE_COLUMNS]

            t0 = time.perf_counter()
            classes = self.label_encoder.classes_

            # Per-model probabilities (RF, XGB, LGBM — each calibrated)
            member_probs = {
                name: est.predict_proba(data)[0]
                for (name, _), est in zip(self._voter.estimators,
                                          self._voter.estimators_)
            }
            # Weighted soft voting: sum_i w_i * P_i
            probabilities = sum(
                self.weights[name] * p for name, p in member_probs.items())
            inference_ms = (time.perf_counter() - t0) * 1000.0

            def _top(probs, k):
                idx = np.argsort(probs)[::-1][:k]
                return [(classes[i], float(probs[i] * 100)) for i in idx]

            top_predictions: List[Tuple[str, float]] = _top(
                probabilities, top_k)
            crop_name, confidence = top_predictions[0]
            member_names = {'rf': 'RandomForest', 'xgb': 'XGBoost',
                            'lgb': 'LightGBM'}
            models_out = {
                member_names.get(n, n): {
                    'weight': round(self.weights[n], 4),
                    'top_predictions': [
                        {'crop': c, 'confidence': round(p, 2)}
                        for c, p in _top(pr, 3)],
                } for n, pr in member_probs.items()
            }

            prediction_summary = {
                'top_crop': crop_name,
                'alternatives': [opt[0] for opt in top_predictions[1:4]]
            }
            ai_advice = generate_crop_advice(input_data, prediction_summary)

            result = {
                'success':         True,
                'crop_name':       crop_name,
                'confidence':      confidence,
                'top_predictions': top_predictions,
                'input_data':      input_data,
                'ai_advice':       ai_advice,
                'models':          models_out,
                'ensemble': {
                    'method':  'weighted soft voting',
                    'weights': {member_names.get(k, k): round(v, 4)
                                for k, v in self.weights.items()},
                    'top_3':   [{'crop': c, 'confidence': round(p, 2)}
                                for c, p in top_predictions[:3]],
                },
                'inference_ms':    round(inference_ms, 1),
            }

            logger.log_info(
                "CROP",
                f"Ensemble prediction: {crop_name} ({confidence:.1f}%) "
                f"| inference {inference_ms:.0f} ms")
            return result

        except Exception as e:
            error_msg = f"Prediction failed: {str(e)}"
            logger.log_error("CROP", error_msg)
            return {'success': False, 'error': error_msg}
