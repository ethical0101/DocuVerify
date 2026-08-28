# Model Card — DocuVerify Forensic Evidence-Fusion Pipeline

## Overview
DocuVerify does not use one end-to-end "fake/genuine" classifier. It runs several independent,
mostly-classical forensic engines and fuses their outputs. This card covers the whole pipeline plus the
one trained component (the optional Logistic Regression fusion model).

| Component | Type | Trained? |
|---|---|---|
| Document boundary / deskew | Classical CV (contour + perspective transform) | No |
| OCR | EasyOCR (pretrained, CRAFT detector + CRNN recognizer) | Pretrained, not fine-tuned |
| Visual forensics (ELA, noise residual, copy-move) | Classical signal processing | No |
| Typography analysis | OCR-box statistics (height/ink-density, robust z-scores, font-size clustering) | No |
| Layout/structure analysis | OCR-box geometry statistics | No |
| Metadata analysis | EXIF / PDF doc-info parsing + keyword rules | No |
| Semantic/text consistency | Regex + date/ID cross-checks over OCR text | No |
| Evidence fusion | Fixed weighted average **or** Logistic Regression | LR variant trained on our synthetic train split |
| Explanation | Deterministic template, or optional LLM narration of the evidence object | N/A (LLM never decides authenticity) |

## Training data
- **Source:** DocuVerify's own synthetic identity-card and certificate generator (see `DATASETS.md`).
- **Split:** 70% train / 15% val / 15% test, partitioned by source document ID (no genuine document and
  its forged derivative ever cross a split boundary).
- **Size at time of evaluation:** see `data/synthetic/split_stats.json` and `evaluation/results.json`
  for the exact counts used to produce the numbers below — these are not fixed and depend on how many
  documents `generate_synthetic_documents.py` was run with.

## Evaluation results
Full numbers (never fabricated — regenerate anytime with `python scripts/evaluate.py`) live in
`evaluation/results.json` and `evaluation/report.md`. Headline honest result from this build:

- **ROC-AUC on the held-out synthetic test set: 0.565** for the fixed heuristic weighted-fusion model
  (mean authenticity score: genuine 69.1 vs. forged 68.5 — correct direction, weakly separated). This
  started at ~0.49 (chance) with our first visual-forensics signal (a blind ELA/noise grid scan), which
  we report honestly rather than hide: it revealed that our forgery generator's JPEG-recompression pass
  on edited regions (real genuine docs stay lossless PNG) leaves an edge-sharpness/ringing fingerprint
  the grid scan wasn't measuring. Adding `text_region_forensics.py` (OCR-word-localized ELA/noise vs.
  the document's own robust baseline) and `sharpness_forensics.py` (column-clustered Laplacian-variance
  z-scores, matched to that specific artifact) raised ROC-AUC to 0.565. This is still a **weak, honest
  signal — not a strong classifier** — reported as such rather than oversold (see `evaluation/report.md`
  for the exact numbers, including the diagnostic-only best-threshold accuracy of 75% at threshold=73,
  which is not the number reported as "the" accuracy since it wasn't chosen a priori).
- Two additional visual detectors were built and evaluated — `copy_move.py` (block-duplicate matching)
  and `jpeg_blockiness.py` (DCT block-grid periodicity) — but are **not wired into the pipeline**: both
  had too high a false-positive rate on text-heavy documents in the time available. They're left in the
  tree as documented, unshipped future work rather than merged half-validated.
- `scripts/train_fusion_model.py` trains a small Logistic Regression over the same 5 evidence signals
  on the train split and reports its own val AUC/accuracy against the heuristic baseline
  (`ml/models/fusion_lr_report.json`) — whichever performs better on validation is the honest choice to
  present; we did not cherry-pick test-set numbers to select it.
- Localization: mean IoU between predicted region bboxes and ground-truth forgery regions, computed
  only over forged test documents that had at least one predicted region — see `evaluation/results.json`
  for the exact value and sample count; it is low in this build (classical grid/word-level detectors are
  imprecise at pixel-level bbox agreement even when they correctly identify the right general area).

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
- **Weak aggregate discrimination on the current dataset** (ROC-AUC 0.565, up from an initial 0.49 —
  see above). The individual engines behave sensibly in isolation (e.g. the typography and
  sharpness-forensics engines do flag a replaced name field in spot checks — see the demo flow in
  `docs/demo.md`), but the fixed fusion weights were hand-picked, not calibrated, and 24 hours was not
  enough to properly tune them without overfitting to the small test set. This is the single most
  important thing to fix with more time (see Future Work in `FINAL_REPORT.md`).
- **ELA/noise forensics are weak on clean, lossless synthetic renders.** Error Level Analysis assumes a
  JPEG-compression history; our genuine documents are pristine PNGs, so ELA differences between
  genuine/forged regions are much subtler than on a real re-photographed/re-scanned/re-saved document.
  We inject a realistic JPEG-quality pass into forged regions specifically to give ELA something to
  detect (see `scripts/generate_forgeries.py`), but this is a synthetic-data artifact, not a guarantee
  that real-world tampering will look the same.
- **OCR quality gates everything downstream.** Typography, layout, and semantic-consistency signals all
  require OCR word boxes; a blurry, rotated, or very low-resolution document degrades every downstream
  signal at once, not just OCR accuracy.
- **No face-morph / portrait-substitution-specific detector.** Portrait region detection (Haar cascade)
  locates a face for display purposes only; it does not verify whether the face itself was swapped.
- **English-only OCR/keyword heuristics** (`ID_KEYWORDS`, `EDU_KEYWORDS`, date regexes assume
  DD/MM/YYYY-style formats).

## Model version
`docuverify-fusion-v0.1` (see `app/models/db_models.py` / `app/services/fusion/fusion.py`).
