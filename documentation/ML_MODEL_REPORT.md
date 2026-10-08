# ML Model Report

Smart Agriculture - ML-powered decision support, enhanced with Generative AI.

```
Leaf image ─► EfficientNet-B0 ─► softmax ─► confidence guard ─► Grad-CAM ─► severity ─┐
N,P,K,T,H,pH,R ─► RF + XGBoost + LightGBM (weighted soft vote) ─► top-3 crops ───────┼─► Gemini
Crop,State,Season,Year ─► XGBoost Regressor ─► t/ha → hg/ha ─► risk analysis ─────────┘  (explains only)
```

Gemini (`smart_system/gemini_advisor.py`, `farm_ai_assistant.py`) receives the
ML result and writes advice. It never decides a disease, a crop or a yield.
Exact input orders/units: see [`MODEL_SPECIFICATION.md`](../MODEL_SPECIFICATION.md).

**How numbers were obtained.** Metrics marked *re-computed* were produced by
running the scripts in this repo on 2026-10-08. Metrics marked *stored* come
from the training run's own report files; the corresponding datasets are not
in the repository, so they could not be re-verified.

---

## 1. Disease detection

| | |
|---|---|
| Dataset | Merge of PlantVillage, "New Plant Diseases Dataset (Augmented)", PlantDoc and Cassava Leaf Disease (see `disease_model/data_prep/`). 115,932 images |
| Classes | 52 |
| Architecture | EfficientNet-B0, ImageNet-pretrained, last two feature blocks + head fine-tuned; head `Dropout(0.3)+Linear(1280,52)` |
| Input / preprocessing | 224×224, `Resize((224,224))`, ImageNet mean/std (train and inference now identical) |
| Training | AdamW, lr 1e-4, ReduceLROnPlateau, 15 epochs, batch 32, 80/20 random split (seed 42); train aug: random crop, flips, rotation, colour jitter, affine |
| Result (*stored*) | best val accuracy **94.59 %**; final epoch train 94.5 % / val 94.6 % (`reports/training_history.json`) |
| Precision / recall / F1 / confusion matrix | **Not stored in the repo.** `disease_model/scripts/evaluate_disease_model.py` (updated for EfficientNet-B0, project-relative paths, `DISEASE_DATA_DIR` env var) produces them when the dataset is available. |
| Grad-CAM | Real: forward/backward hooks on the last conv layer, gradient-weighted activation maps, ReLU, overlay (`plant_doctor/gradcam.py`) |
| API output | `/predict-disease`, `/detect-disease`, `/plant-doctor`: `model`, class, confidence, top-5, `inference_ms`, heatmap |

**Caveats.** (1) The 94.6 % figure comes from a random split of a dataset that
includes pre-augmented images, so near-duplicates of training images are
likely in validation; field accuracy will be lower. (2) The ResNet-50 /
EfficientNet-B1 secondary ensemble has no trained checkpoints (see
specification) and is disabled. (3) No labelled leaf test images ship with the
repo; the end-to-end smoke test used a Grad-CAM overlay image only to prove the
pipeline runs (it returned a Tomato late-blight class), which is *not* an
accuracy claim.

## 2. Crop recommendation

| | |
|---|---|
| Dataset | `crop_model/data/combined/final_crop_dataset.csv`, 2,200 rows, 22 crops (100 each), 7 raw features |
| Features | 7 raw → 21 engineered (order in specification) |
| Members | RandomForest (500), XGBoost (400), LightGBM (400), each probability-calibrated |
| Ensemble | Weighted soft voting, `P = Σ wᵢPᵢ`, default 1/3 each; runtime-configurable |
| Split | stratified 80/20, seed 42 → 1,760 train / 440 test |

Hold-out test, 440 samples (*re-computed*, `reports/evaluation_metrics.json`):

| Model | Accuracy | Precision (w) | Recall (w) | F1 (macro) |
|---|---|---|---|---|
| Ensemble | 0.9955 | 0.9959 | 0.9955 | 0.9954 |
| Random Forest | 0.9977 | 0.9978 | 0.9977 | 0.9977 |
| XGBoost | 0.9955 | 0.9959 | 0.9955 | 0.9954 |
| LightGBM | 0.9955 | 0.9959 | 0.9955 | 0.9954 |

Stratified 5-fold CV on the training split (*re-computed*): folds
0.9886, 1.0000, 0.9858, 0.9858, 0.9943 → **0.9909 ± 0.0055**.
Per-class report: `reports/classification_report.txt`; confusion matrix:
`reports/confusion_matrix.png`.

**Correction.** `train_crop_model.py` previously assigned
`cv_scores = np.array([0.9955, 0.9898, 0.9920, 0.9945, 0.9872])` instead of
running cross-validation, so the stored "0.9918 ± 0.0030" was not a measured
value. The script now runs real CV and `model_metadata.json` carries the
re-computed 0.9909 ± 0.0055. The test-set numbers were genuine and match.

**Caveat.** The dataset is the well-known clean Kaggle crop table (synthetic-like,
very well separated); ~99.5 % reflects that, not field performance.

Example (real run): N=90, P=42, K=43, 20.9 °C, 82 % RH, pH 6.5, 203 mm →
ensemble **rice 94.1 %**, jute 3.5 %, pigeonpeas 0.2 %
(RF 100 % / XGB 94.7 % / LGBM 87.5 % for rice). Setting weights to
RF 0.4 / XGB 0.3 / LGBM 0.3 gave rice 94.65 %, jute 3.11 %.

## 3. Yield prediction

| | |
|---|---|
| Data | Merged India crop-production yield table (state × crop × year × season), 339,390 rows with a valid yield, 1997-2020 (*stored*; CSV not in repo) |
| Features | 6, see specification (state, crop, year, decade, years-since-2000, season) |
| Model | `XGBRegressor`, 500 trees, depth 8, lr 0.05, subsample 0.8 |
| Target / unit | `Yield`; model emits **t/ha**, converted explicitly to hg/ha for the API |
| Metrics (*stored*, 10 % hold-out, 33,939 rows) | R² **0.881**, MAE 21.97, RMSE 322.47, 5-fold CV R² (50k subsample) 0.872 ± 0.038 |

**Caveats.** (1) MAE/RMSE are in the training target's units, which are not
recorded next to them; an RMSE ≫ MAE and a MAPE of 286 % indicate a heavy-tailed
target (some crops, e.g. coconut, are recorded in different units), so R² is the
most trustworthy figure. (2) Only categorical/time features are used; weather
and soil do not enter the model. Season/state/crop effects dominate, so
forecasts are long-run regional averages, not field-level predictions.
(3) Punjab rice 2022 → 2.24 t/ha is below typical reported yields (~4 t/ha).

Example (real run): Rice, Punjab, Kharif, 2022 → raw 2.242 t/ha =
**22,418 hg/ha** (MEDIUM).

---

## 4. Observability and demo

* `GET /health` and `GET /ml/status` report per-model `loaded` flags that are
  true only if the model object is in memory, plus type, class count, input
  size, ensemble members/weights, units and a `reason` when unavailable.
  UI: sidebar → **ML Status**.
* Every prediction logs model, prediction, confidence and inference time (no
  images or user data), e.g. `EfficientNet-B0 -> Tomato___Late_blight (100.0%, HIGH) | inference 431 ms`,
  `Ensemble prediction: rice (94.1%) | inference 588 ms`,
  `XGBoost: 2.242 t/ha = 22,418 hg/ha (MEDIUM) | 14 ms`.
* Admin only (`ADMIN_TOKEN` env var + `X-Admin-Token` header; disabled when
  unset): `POST /debug/crop-models` (per-model probabilities),
  `POST /crop-ensemble-weights`, `POST /ensemble-weights`.

### Reproducing the evaluation

```
python crop_model/scripts/evaluate_crop_model.py                  # crop (runs here)
set DISEASE_DATA_DIR=<ImageFolder path> && python disease_model/scripts/evaluate_disease_model.py
python yield_model/scripts/train_yield_model.py                   # needs the yield CSV (path inside script)
```
