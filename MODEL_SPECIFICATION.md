# MODEL SPECIFICATION

Ground truth for what the three trained models expect at inference time.
Every item below was read from the saved model files / training code, not
from the frontend. Verified 2026-10-08.

## 1. Disease detection (deep learning)

| Item | Value | Source |
|---|---|---|
| Architecture | EfficientNet-B0 (torchvision), ImageNet-V1 pretrained, fine-tuned (last 2 blocks `features.7/8` + head) | `train_disease_model.py`, checkpoint keys |
| Head | `Dropout(0.3)` → `Linear(1280, 52)` | `train_disease_model.py` |
| Checkpoint | `disease_model/models/disease_model.pth` (state_dict, 360 tensors, `weights_only` loadable) | file |
| Classes | 52, order = `class_names.json` (ImageFolder alphabetical) | `class_names.json` |
| Input size | 224 × 224 RGB | metadata |
| Training val preprocessing | `Resize((224,224))` → `ToTensor` → Normalize(ImageNet mean/std) | `train_disease_model.py` |
| Inference preprocessing | **identical** (`DiseaseEngine.transform`). *Before 2026-10-08 inference used `Resize(256)+CenterCrop(224)`, which did not match training; fixed.* | `smart_system/disease_engine.py` |
| Test-time augmentation | softmax averaged over original + horizontal flip | `disease_engine.py` |
| Explainability | Grad-CAM on the last conv layer of the same model | `plant_doctor/gradcam.py` |
| Reported val accuracy | 94.59 % (15 epochs, 92,745 train / 23,187 val) | `model_metadata.json` |

**Secondary ensemble (ResNet-50 / EfficientNet-B1):** the code supports it but
no fine-tuned checkpoints exist (`ensemble_resnet50.pth`,
`ensemble_efficientnet_b1.pth` are absent; produced by
`train_ensemble_models.py`). Previously these networks were loaded with random
classifier heads and still voted. They are now loaded **only** when a
fine-tuned checkpoint exists; otherwise the system runs EfficientNet-B0 alone
and `/health` says so.

## 2. Crop recommendation (tabular ensemble)

**Exact feature order (21 columns), enforced at load time** against
`model.feature_names_in_`:

| # | Feature | # | Feature |
|---|---|---|---|
| 1 | Nitrogen | 12 | log_humidity |
| 2 | Phosphorus | 13 | temp_humidity |
| 3 | Potassium | 14 | temp_rainfall |
| 4 | Temperature | 15 | humidity_rainfall |
| 5 | Humidity | 16 | soil_index |
| 6 | pH | 17 | heat_stress |
| 7 | Rainfall | 18 | drought_stress |
| 8 | N_P_ratio | 19 | acidic_soil |
| 9 | N_K_ratio | 20 | neutral_soil |
| 10 | P_K_ratio | 21 | alkaline_soil |
| 11 | log_rainfall | | |

The first 7 are the raw user inputs; 8-21 are derived by
`feature_utils.engineer_features` (mirrored in `crop_engine._engineer_features`).

* Model: `Pipeline([VotingClassifier(soft)])` of three `CalibratedClassifierCV`
  wrappers: RandomForest (500 trees, isotonic), XGBoost (400, sigmoid),
  LightGBM (400, sigmoid). No scaler. 22 classes (`label_encoder.pkl`).
* **Weights:** trained with equal voting. At inference the engine computes
  `P = Σ wᵢ·Pᵢ` from the three fitted members; default `w = 1/3` each
  (reproduces the original output to 1e-19). Weights are changeable at runtime
  (`POST /crop-ensemble-weights`, admin) and demonstrably change the result.

## 3. Yield prediction (XGBoost regression)

| Item | Value |
|---|---|
| Model | `XGBRegressor` (`yield_model/models/yield_model.pkl`), 500 trees, depth 8 |
| Feature order (6) | `Area_encoded, Item_encoded, Year, Decade, Years_since_2000, Season_encoded` |
| Encoders | `area_encoder.pkl` (36 states/UTs), `crop_encoder.pkl` (56 crops), `Season_encoded` map Kharif=1, Rabi=2, Whole Year=3, Autumn=4, Summer=5, Winter=6, unknown=0 |
| Target | `Yield` column of the merged yield dataset |
| **Native output unit** | **tonnes / hectare** (t/ha) — inferred from outputs: Punjab rice → 2.24, Punjab wheat → 2.54, UP sugarcane → 59.5. The training CSV is not in the repo, so this is inferred from model behaviour, not from the data. |
| API / UI unit | hg/ha (FAO). Conversion is explicit: `hg/ha = t/ha × 10,000` (`config.T_HA_TO_HG_HA`). Responses include `raw_model_output` and `raw_model_unit`. |

*Bug fixed 2026-10-08:* the raw t/ha value was labelled "hg/ha" and compared
against hg/ha thresholds, so every forecast showed as `LOW` and the UI (÷10,000)
displayed ≈ 0.00 t/ha.
