"""
Crop Recommendation Model - Real Evaluation
============================================
Re-creates the exact hold-out split used by train_crop_model.py
(stratified, test_size=0.2, random_state=42), evaluates the SAVED model
and each ensemble member on it, and runs genuine stratified 5-fold CV on
a fresh (unfitted) clone of the ensemble.

Outputs: reports/evaluation_metrics.json  (+ printed summary)

Usage:  python crop_model/scripts/evaluate_crop_model.py [--skip-cv]
"""
import json
import os
import sys
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                             recall_score)
from sklearn.model_selection import (StratifiedKFold, cross_val_score,
                                     train_test_split)

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from feature_utils import engineer_features, FEATURE_COLUMNS  # noqa: E402

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data", "combined", "final_crop_dataset.csv")
MODELS = os.path.join(BASE, "models")
REPORTS = os.path.join(BASE, "reports")
RANDOM_STATE, TEST_SIZE, CV_FOLDS = 42, 0.2, 5


def metrics(y_true, y_pred):
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision_weighted": round(float(precision_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        "recall_weighted": round(float(recall_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        "f1_macro": round(float(f1_score(y_true, y_pred, average="macro")), 4),
        "f1_weighted": round(float(f1_score(y_true, y_pred, average="weighted")), 4),
    }


def main(skip_cv=False):
    # Same cleaning as training (drop NaN / duplicates) so the split matches.
    df = pd.read_csv(DATA).dropna().drop_duplicates()
    df = engineer_features(df)
    le = joblib.load(os.path.join(MODELS, "label_encoder.pkl"))
    X, y = df[FEATURE_COLUMNS], le.transform(df["Crop"])
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y)

    pipe = joblib.load(os.path.join(MODELS, "improved_crop_model.pkl"))
    voter = pipe.named_steps["model"]

    out = {"n_test": int(len(X_te)), "n_train": int(len(X_tr)),
           "feature_order": FEATURE_COLUMNS,
           "ensemble": metrics(y_te, pipe.predict(X_te)), "members": {}}
    for (name, _), est in zip(voter.estimators, voter.estimators_):
        out["members"][name] = metrics(y_te, est.predict(X_te))

    if not skip_cv:
        cv = StratifiedKFold(CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
        scores = cross_val_score(clone(pipe), X_tr, y_tr, cv=cv, scoring="accuracy", n_jobs=1)
        out["cv"] = {"folds": CV_FOLDS, "scores": [round(float(s), 4) for s in scores],
                     "mean": round(float(scores.mean()), 4),
                     "std": round(float(scores.std()), 4),
                     "data": "training split only"}

    path = os.path.join(REPORTS, "evaluation_metrics.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(json.dumps(out, indent=2))
    print("saved:", path)


if __name__ == "__main__":
    main(skip_cv="--skip-cv" in sys.argv)
