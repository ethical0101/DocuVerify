# Methodology

## Evidence fusion weights

`app/services/fusion/fusion.py` combines five 0-1 anomaly signals into a single risk score using a
fixed weighted average:

| Signal | Weight | Rationale |
|---|---|---|
| Visual anomaly | 0.30 | Highest weight — visual/compression tampering signatures are the hardest to fake convincingly. |
| Semantic anomaly | 0.25 | Cross-field consistency (dates, repeated IDs) is a strong, hard-to-fake signal when present. |
| Typography anomaly | 0.20 | Reliable for text-replacement forgeries specifically; weighted below visual/semantic because it depends entirely on OCR quality. |
| Layout anomaly | 0.15 | Useful but noisier — genuine documents can legitimately have some structural irregularity. |
| Metadata anomaly | 0.10 | Lowest weight — metadata is frequently absent or stripped on genuine documents (re-saves, screenshots), so it's the weakest standalone signal. |

**These weights are hand-picked, not fit to data.** We say this plainly rather than presenting them as
scientifically derived. `scripts/train_fusion_model.py` trains an alternative (a small Logistic
Regression over the same five signals) and reports how it compares on a held-out validation split — see
`MODEL_CARD.md` for the honest before/after numbers. A signal that could not be computed (OCR
unavailable, insufficient text, etc.) contributes `None` and is excluded from both the weighted average
and the weight-sum used for confidence, rather than being silently treated as "0 anomaly, definitely
fine."

## Risk tiers

`risk_score` (the weighted-average anomaly, 0-1) maps to:
- **LOW**: risk_score < 0.30 → authenticity_score > 70
- **MEDIUM**: 0.30 ≤ risk_score < 0.55 → 45 ≤ authenticity_score ≤ 70
- **HIGH**: risk_score ≥ 0.55 → authenticity_score < 45

## Confidence

`confidence` reflects how much of the total possible evidence weight actually contributed a signal
(e.g. if OCR was unavailable, typography/layout/semantic signals are all `None`, so confidence is low
even if the visual signal alone looks clean) — it is a measure of evidence completeness, not of
certainty that the score is "correct."

## Forgery-type diagnosis

`diagnose_forgery_types()` maps any signal above 0.5 to a corresponding manipulation-type label
(`visual_manipulation`, `typography_inconsistency`, `structural_anomaly`, `metadata_anomaly`,
`semantic_inconsistency`). Multiple types can co-occur. This is a direct, transparent mapping — not a
separate learned classifier — so it is always explainable by pointing back at the signal that triggered it.

## Region localization

Regions come from three independent sources, all included in the final region list:
1. OCR-word-localized visual-anomaly regions (`text_region_forensics.py`) — the primary, most sensitive
   signal, compares each word's ELA/noise statistics against the document's own robust baseline.
2. Copy-move block matches (`copy_move.py`) — flags near-duplicate blocks far apart on the page.
3. Typography-inconsistency word regions (`typography/analyzer.py`).
4. The detected portrait region (identity documents only) — shown for context, not itself a forgery signal.

## Honesty commitments

- No metric in this repository is fabricated. `evaluation/results.json` and `evaluation/report.md` are
  regenerated directly by `scripts/evaluate.py` against the current codebase and dataset; re-run it
  yourself to verify.
- Where a result is weak (see the ROC-AUC ~0.49 heuristic baseline in `MODEL_CARD.md`), it is reported
  as-is, with the reasoning for why, rather than adjusted post-hoc to look better.
