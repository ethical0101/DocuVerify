# Model Card — DocuVerify Forensic Evidence-Fusion Pipeline

## Overview

DocuVerify does not use one end-to-end "fake/genuine" classifier. It runs several independent,
mostly-classical forensic engines for evidence and region localization, and drives the final
authenticity score with a **trained RandomForest authenticity classifier** over whole-image forensic
features. This card covers the whole pipeline plus the trained components.

| Component                                          | Type                                                                           | Trained?                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| Document boundary / deskew                         | Classical CV (contour + perspective transform)                                 | No                                             |
| OCR                                                | EasyOCR (pretrained, CRAFT detector + CRNN recognizer)                         | Pretrained, not fine-tuned                     |
| Visual forensics (ELA, noise residual, sharpness)  | Classical signal processing                                                    | No                                             |
| Typography analysis                                | OCR-box statistics (height/ink-density, robust z-scores, font-size clustering) | No                                             |
| Layout/structure analysis                          | OCR-box geometry statistics                                                    | No                                             |
| Metadata analysis                                  | EXIF / PDF doc-info parsing + keyword rules                                    | No                                             |
| Semantic/text consistency                          | Regex + date/ID cross-checks over OCR text                                     | No                                             |
| **Authenticity classifier (primary score driver)** | **RandomForest over 11 whole-image forensic features**                         | **Yes — trained on our synthetic train split** |
| Evidence fusion                                    | Trained-model probability (0.8) blended with transparent heuristic (0.2)       | See `fuse_with_ml()`                           |
| Explanation                                        | Deterministic template, or optional LLM narration of the evidence object       | N/A (LLM never decides authenticity)           |

## Primary model: authenticity classifier

`scripts/train_authenticity_model.py` trains a `RandomForestClassifier(n_estimators=300, max_depth=6,
min_samples_leaf=3, class_weight="balanced")` on an 11-dimensional feature vector
(`backend/app/services/visual_forensics/image_features.py`): ELA-at-q55/q90 distribution statistics
(median, std, p95), the distribution of ELA over inked (text-bearing) regions relative to the page
(min/p10 ratio, range), noise-residual std, high-frequency (Laplacian) energy, and Laplacian variance.

The design rationale is honest and data-driven: no single classical heuristic reliably separates our
forgeries blind (we measured whole-page ELA, localized blockiness, and OCR-word ELA ratios — all landed
at 60–68% because the edited region is small on a busy page and OCR doesn't reliably localize it). The
edits are re-encoded at JPEG quality 55 and pasted onto lossless-PNG genuine documents, so the
discriminating signal lives in the _distribution_ of compression/noise statistics — which a trained
model over several weak features captures far better than any one threshold. The feature extractor uses
the exact same preprocessing (`load_primary_page`, including deskew) at train and inference time, so
there is no train/serve skew.

The trained model's forged-probability drives the final risk score (weighted 0.8, with the transparent
heuristic fusion at 0.2). Risk tiers are calibrated to its test-split probability distribution: risk
< 0.45 → LOW, < 0.58 → MEDIUM, else HIGH. If the model artifact is missing, the pipeline falls back to
the pure heuristic fusion so the product still works (weaker).

## Training data

- **Source:** DocuVerify's own synthetic identity-card and certificate generator (see `DATASETS.md`).
- **Split:** 70% train / 15% val / 15% test, partitioned by source document ID (no genuine document and
  its forged derivative ever cross a split boundary).
- **Size at time of evaluation:** see `data/synthetic/split_stats.json` and `evaluation/results.json`
  for the exact counts used to produce the numbers below — these are not fixed and depend on how many
  documents `generate_synthetic_documents.py` was run with.

## Evaluation results

Full numbers (never fabricated — regenerate anytime with `python scripts/evaluate.py` for the pipeline,
or `python scripts/train_authenticity_model.py` for the classifier's own report) live in
`evaluation/results.json`, `evaluation/report.md`, and `ml/models/authenticity_rf_report.json`.

**Trained authenticity classifier (primary), held-out synthetic test split:**

- **ROC-AUC 0.826** (its own report).
- Mean predicted forged-probability: **genuine 0.38 vs. forged 0.70** — clearly separated.
- Test accuracy ~0.77, precision ~0.93 at the 0.5 threshold.

**Full pipeline through the score (`scripts/evaluate.py`, same held-out test split):**

- **ROC-AUC 0.826** (risk score vs. forged label).
- **Mean authenticity score: genuine 63.1 vs. forged 37.8** — a clear ~25-point separation. For
  comparison, the previous pure-heuristic build scored genuine 69.0 vs. forged 68.8 (effectively
  indistinguishable, ROC-AUC 0.52); wiring in the trained classifier is what fixed the "genuine reads
  like forged" problem.
- Best-threshold accuracy 87.5%; accuracy 75% at the fixed a-priori threshold of 55.
- Average analysis latency ~3.9s (the two extra ELA passes for the feature vector add a modest cost).

### Honest history (why this is where it landed)

The pipeline started with pure classical heuristics at ROC-AUC ~0.52–0.56 (near chance). We measured
several single blind discriminators (whole-page ELA, localized JPEG-blockiness, OCR-word ELA ratios) —
all 60–68%, because the edited region is a small patch on a busy page and OCR doesn't reliably land on
it. A paired-region ELA test using ground-truth bboxes separated 83%, confirming the signal is real but
not blindly localizable. The fix was to stop trying to localize the edit and instead train a model over
the _distribution_ of forensic features across the whole image — reaching 0.826. Reported as-is, not
oversold: it is a solid classifier on **synthetic** data, not a validated real-world detector.

### Other detectors evaluated but not wired in

`copy_move.py` and `jpeg_blockiness.py` were built and measured but are **not** in the pipeline: on the
flat synthetic renders both saturate (~1.0 on 75–115 blocks) on genuine and forged alike — no
discriminative power. They remain in the tree as documented, unshipped work valid for real photographed
documents (see `docs/methodology.md`). The older Logistic Regression _evidence_-fusion model
(`scripts/train_fusion_model.py`, over the 5 aggregate signals) is retained for comparison but is
superseded by the RandomForest feature classifier as the score driver.

- Localization: mean IoU between predicted region bboxes and ground-truth forgery regions (~0.034 over
  36 forged test docs). This is **low** — the classical region detectors flag the general area but are
  imprecise at pixel-level bbox agreement, and the _score_ now comes from the whole-image classifier
  rather than region overlap. Region overlays remain useful for human review, not IoU.

## Intended use

- A decision-support signal for a human document reviewer (bank/university/employer intake staff,
  hackathon judges evaluating the concept) — never an automated accept/reject gate.
- Identity cards and educational certificates specifically; other document types are out of scope.

## Non-intended use

- **Not** an official government identity verification service. It does not connect to Aadhaar,
  Passport Seva, DMV, or any other government database.
- **Not** validated on real-world scanned or photographed documents — only on this project's synthetic
  renders. Do not deploy this against real applicant documents without independent validation.
- **Not** a legal or financial decision-making system. Do not use the risk score as sole grounds for
  denying a person a service.

## Known limitations / failure modes

- **Trained on synthetic data only — real-world generalization is unproven.** The classifier reaches
  ROC-AUC 0.826 on the held-out synthetic test split, but it partly learns the specific compression
  fingerprint our forgery generator leaves (a JPEG-quality-55 pass on edited regions of otherwise
  lossless-PNG documents). Real-world tampering will not necessarily carry that exact signature, so this
  number should NOT be read as real-world accuracy. Validating/retraining on real photographed/scanned
  documents is the single most important next step (see Future Work in `FINAL_REPORT.md`).
- **Small training set.** 224 training documents (source-grouped, no leakage) is enough for a shallow
  RandomForest but limits how much the model can generalize; expanding the dataset is high priority.
- **ELA/noise forensics assume a compression history.** Error Level Analysis assumes JPEG compression;
  our genuine documents are pristine PNGs. The forgery generator injects a realistic JPEG pass into
  edited regions to give the features something to detect — which is exactly why the model works on this
  data and why that success may not transfer unchanged to real documents.
- **OCR quality gates everything downstream.** Typography, layout, and semantic-consistency signals all
  require OCR word boxes; a blurry, rotated, or very low-resolution document degrades every downstream
  signal at once, not just OCR accuracy.
- **No face-morph / portrait-substitution-specific detector.** Portrait region detection (Haar cascade)
  locates a face for display purposes only; it does not verify whether the face itself was swapped.
- **English-only OCR/keyword heuristics** (`ID_KEYWORDS`, `EDU_KEYWORDS`, date regexes assume
  DD/MM/YYYY-style formats).

## Model version

`docuverify-fusion-v0.1` pipeline with the `authenticity_rf` classifier as the primary score driver
(see `app/services/fusion/ml_authenticity.py` and `ml/models/authenticity_rf_report.json`).
