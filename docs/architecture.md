# Architecture

## Request flow

1. **Upload** (`POST /api/documents/upload`) — validates extension/size, stores the file under a random
   UUID filename, hashes it (SHA-256), records page count, persists a `Document` row.
2. **Analyze** (`POST /api/documents/{id}/analyze`) — runs `app/services/pipeline.py:analyze_document`,
   persists the result as an `Analysis` row linked to the document.
3. **Results** (`GET /api/documents/{id}/results`) — returns the latest analysis: score, risk level,
   evidence breakdown, regions, forgery types, explanation.

## Pipeline stages (`app/services/pipeline.py`)

Each stage below is wrapped in a `_safe()` helper that catches exceptions and substitutes a neutral
default, so a single engine failing (e.g. OCR unavailable, a malformed PDF page) degrades that one
signal instead of failing the whole analysis.

1. **Preprocessing** (`preprocessing/loader.py`) — PDF pages rendered via PyMuPDF (no external Poppler
   binary needed); images loaded via Pillow with EXIF-aware orientation correction.
2. **Document detection** (`document_detection/detector.py`) — classical contour-based quadrilateral
   detection + perspective transform, so photographed (not just flat-scanned) documents are corrected
   before analysis. Falls back to the original frame if no confident quadrilateral is found.
3. **OCR** (`ocr/engine.py`) — EasyOCR if installed, else pytesseract if the `tesseract` binary is on
   PATH, else OCR-dependent signals are skipped and the result says so explicitly.
4. **Visual forensics** (`visual_forensics/`) — Error Level Analysis, noise-residual statistics, and
   copy-move block matching; the primary signal is an OCR-word-localized comparison
   (`text_region_forensics.py`) using robust median/MAD z-scores per word against the document's own
   baseline (falls back to a blind page-grid scan if OCR text is unavailable).
5. **Typography** (`typography/analyzer.py`) — clusters OCR words by glyph height (so legitimately
   different font sizes, e.g. a form label vs. its value, don't register as anomalies against each
   other) and flags words whose height/ink-density differ from their own size cluster.
6. **Layout** (`layout/analyzer.py`) — line-spacing regularity and margin checks from OCR geometry.
7. **Metadata** (`metadata/extractor.py`) — EXIF (images) / doc-info (PDFs); explicitly reports "missing"
   as neutral, never as suspicious, and flags known editor software signatures as an anomaly.
8. **Semantic consistency** (`semantic/consistency.py`) — date-relationship sanity checks and
   repeated-identifier consistency checks over the OCR text.
9. **Identity/education classification** (`identity/detector.py`, `education/detector.py`) — keyword-based
   document-category classification; identity documents additionally get a Haar-cascade portrait-region
   box for the viewer.
10. **Fusion** (`fusion/fusion.py`) — combines the five 0-1 anomaly signals into an authenticity score,
    risk level, and confidence via fixed, documented weights (see `docs/methodology.md`). An optional
    trained Logistic Regression fusion model is available but not the production default (see
    `MODEL_CARD.md`).
11. **Explainability** (`explainability/explainer.py`) — a deterministic template narrates the fused
    evidence by default; if `LLM_PROVIDER`/`LLM_API_KEY` are configured, an LLM narrates the *same*
    structured evidence object instead (never given the raw image, never allowed to invent findings).

## Data model

- `Document` — filename, stored path, SHA-256, file type, category, page count, status.
- `Analysis` — one per analysis run, linked to a `Document`: score, risk level, confidence, evidence
  JSON, regions JSON, OCR result JSON, forgery types, explanation JSON, timing breakdown, model version.

## Frontend

Single-page state machine (`frontend/src/App.tsx`): landing → upload → analyzing → results. The
document viewer (`DocumentViewer.tsx`) overlays region bounding boxes as an SVG layer scaled to the
image's natural size (via `page_size` from the analysis, or the loaded `<img>`'s natural dimensions),
so overlay coordinates stay correct regardless of how the image is displayed/resized.
