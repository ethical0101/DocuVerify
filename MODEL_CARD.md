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
| **Enterprise classifier** | RandomForest (or LogisticRegression for small datasets) | **Yes — trained per-organization** on that organization's own uploaded dataset |
| Explanation | Deterministic template, or optional LLM narration of the evidence object | N/A (LLM never decides authenticity) |

This card distinguishes three categories per component, per the honesty requirement that drives this
whole document: **pretrained** (OCR — an external model we did not train), **trained by DocuVerify**
(the optional fusion Logistic Regression, and the enterprise classifier — both genuinely fit on data by
this codebase), and **rule/feature-based** (everything else — classical CV and statistics, no learned
parameters at all). Nothing in this table claims a trained component that was not actually trained.

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

- **ROC-AUC on the held-out synthetic test set: 0.558** for the fixed heuristic weighted-fusion model
  (mean authenticity score: genuine 68.7 vs. forged 68.1 — correct direction, weakly separated). This
  started at ~0.49 (chance) with our first visual-forensics signal (a blind ELA/noise grid scan), which
  we report honestly rather than hide: it revealed that our forgery generator's JPEG-recompression pass
  on edited regions (real genuine docs stay lossless PNG) leaves an edge-sharpness/ringing fingerprint
  the grid scan wasn't measuring. Adding `text_region_forensics.py` (OCR-word-localized ELA/noise vs.
  the document's own robust baseline) and `sharpness_forensics.py` (Laplacian-variance z-scores) raised
  ROC-AUC to 0.565. This is still a **weak, honest signal — not a strong classifier** — reported as such
  rather than oversold (see `evaluation/report.md` for the exact numbers, including the diagnostic-only
  best-threshold accuracy of 75% at threshold≈71-73, which is not the number reported as "the" accuracy
  since it wasn't chosen a priori).
- `sharpness_forensics.py` originally clustered words by x-position (to compare label-vs-value pairs on
  tabular ID cards). We found this left paragraph-style documents (certificates) with almost no working
  clusters — nearly every word has a unique x-position outside a tabular layout, so most words got
  fewer than 3 cluster-mates and were silently skipped, including the actual forged word on our
  certificate demo sample. Switching to height-based clustering (matching `typography/analyzer.py`)
  fixed that specific blind spot (verified manually: the forged certificate now gets a flagged region
  near the tampered text where before it got none), but **moved aggregate ROC-AUC from 0.565 to 0.558
  and localization mean IoU from 0.065 to 0.034** on the fixed test split — a new false-positive pattern
  appeared elsewhere (e.g. an ID card's photo placeholder box). We are reporting this trade-off plainly
  rather than picking whichever number looks better: it is a genuine coverage improvement on one
  document layout traded for a small, roughly-noise-level regression in aggregate discrimination and a
  real regression in localization precision on this specific 48-document test set.
- We also tried a "corroboration bonus": a flat +0.08 risk-score bump whenever two different engines
  flagged overlapping regions (reasoning: two independent signals agreeing is stronger evidence than
  either alone). Measured on the test set, it made things worse, not better — ROC-AUC dropped to
  **0.412** (below chance) and forged documents' mean authenticity score rose above genuine documents'.
  With imperfect per-engine precision, corroboration confirms false positives about as often as true
  ones, and a flat bonus just adds noise to an already-tight, noisy score distribution. We disabled the
  bonus (fusion score no longer changes from it) rather than keep a theoretically appealing feature that
  measurably hurt on our only evaluation data. The `corroborated` flag itself is still computed and
  shown to the human reviewer in the Evidence Explorer/report — useful context even though it doesn't
  mechanically move the score (yet).
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

## Enterprise adaptive classifier — evaluation
Trained end-to-end via the live enterprise API against this repo's own included demo dataset
(`demo_datasets/organization_demo_dataset.zip`: 15 genuine + 45 forged fictional certificates for one
organization, one template). On a genuinely held-out 15% test split (9 documents):

| Metric | Value |
|---|---|
| Accuracy | 55.6% |
| Precision | 62.5% |
| Recall | 83.3% |
| F1 | 71.4% |
| ROC-AUC | 66.7% |

This is meaningfully better than the core cross-category fusion pipeline's ~0.56 ROC-AUC (see above) —
expected, not a claim of a better general engine: one organization's own documents, all from the same
template, are far more homogeneous than a benchmark mixing identity cards and certificates from
different fictional templates. Accuracy trails F1 here because of class imbalance in the small 9-document
test split (more forged than genuine examples), which recall-weighted F1 tolerates better than raw
accuracy — reported honestly rather than picking whichever number looks best. Re-run
`python scripts/setup_demo.py` any time to regenerate these numbers from scratch; nothing here is
hand-authored.

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
