# Enterprise Adaptive Model — Training Pipeline

## Code map

| File | Responsibility |
|---|---|
| `ml/models/enterprise_classifier.py` | `EnterpriseDocumentClassifier` — a thin wrapper around a fitted scikit-learn estimator, its algorithm name, and the fixed feature schema (`FEATURE_SCHEMA`). Handles save/load via joblib. |
| `ml/training/feature_extractor.py` | Converts one base-pipeline `analyze_document()` result into the 9-feature vector the classifier consumes. The ONLY place this conversion happens, so training-time and inference-time features can never drift apart. |
| `ml/training/dataset_loader.py` | Turns a validated dataset's genuine/forged path lists into `(path, label)` pairs (forged=1, genuine=0). |
| `ml/training/train_enterprise_model.py` | The actual training pipeline: dataset prep → feature extraction (running the base pipeline once per image) → train/val/test split (70/15/15) → fit → evaluate → return a trained `EnterpriseDocumentClassifier` + real metrics. Accepts a stage callback for progress reporting. |
| `ml/inference/enterprise_predictor.py` | Loads a trained model and scores one document's already-computed pipeline result. Decoupled from the database — callers resolve which `model_path` to use. |
| `app/services/enterprise/dataset_service.py` | Safe ZIP extraction + dataset validation (never model loading). |
| `app/api/enterprise_routes.py` | HTTP layer: upload, train (background thread + pollable job status), registry, activation, users, audit log, dashboard. |

## Feature schema

```json
{
  "visual_anomaly": 0.72,
  "typography_anomaly": 0.21,
  "layout_anomaly": 0.81,
  "metadata_anomaly": 0.33,
  "semantic_anomaly": 0.10,
  "ocr_confidence_mean": 0.92,
  "ocr_word_count_norm": 0.40,
  "region_anomaly_count_norm": 0.30,
  "high_severity_region_count_norm": 0.60
}
```
The first five are the same 0–1 signals the base fusion engine already computes. The last four add OCR
quality/coverage and finding-density context that the base fusion doesn't otherwise expose as a distinct
number. Counts are normalized (capped and scaled) rather than raw so documents with very different
amounts of text don't produce wildly different-scale features.

## Algorithm choice

`RandomForestClassifier(n_estimators=200, max_depth=6, class_weight="balanced")` by default. For very
small training sets (<24 examples after the split) a Random Forest tends to overfit with little benefit
over a simpler model, so the pipeline automatically falls back to
`LogisticRegression(class_weight="balanced")` instead. This is decided once per training run
(`_choose_algorithm`), never hidden from the resulting `ModelVersion.algorithm` field.

## Training stages (real, not simulated)

`dataset_preparation → feature_extraction → train_validation_split → model_training →
cross_validation → evaluation → model_packaging → completed`

Each stage is a genuinely distinct step in `train_enterprise_model()`; the `on_stage` callback fires
only when that stage actually starts/finishes, and the API persists it to the `TrainingJob.stages` JSON
column so the frontend can poll real progress (`GET /api/enterprise/training-jobs/{id}` every 1.5s). The
"cross_validation" stage is a held-out validation split (not fitted on), not k-fold — with a small
dataset, k-fold adds real fit-time cost without materially more signal, which is why we didn't use it.

## Evaluation

`accuracy`, `precision`, `recall`, `f1`, `roc_auc` (when the test split has both classes) — computed
with scikit-learn's standard metrics on a genuinely held-out test split (15% of the dataset, stratified
where class counts allow it). Nothing here is fabricated; see a specific model's `metrics` in the Model
Registry for the exact numbers from its own training run.

## Model registry & activation

Every trained version is stored (`ModelVersion` row + a joblib file this backend itself wrote under
`data/enterprise/<org_id>/models/`). New versions are **archived** by default — an admin must explicitly
activate one; activating a version archives whichever version of the same model name was previously
active. Rollback is just re-activating an older version — it's still in the registry.

## Security notes

- The ZIP upload path never contains a model file — `dataset_service.py`'s `ALLOWED_ZIP_MEMBER_EXT` only
  accepts images and one CSV. A model is only ever produced by this backend's own training code and
  loaded from a path this backend chose, never a path derived from user input. See `SECURITY.md`.
- Training runs in a background thread with its own SQLAlchemy session (sessions aren't thread-safe to
  share with the request thread) so a slow training run doesn't block the API for other requests.
