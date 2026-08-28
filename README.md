# DocuVerify

**AI-Powered Government & Educational Document Forensics**

> Don't just verify documents. Investigate them.

DocuVerify is a 24-hour hackathon prototype that treats document verification as a forensic
investigation rather than a black-box "fake/genuine" classifier. It analyzes identity documents and
educational certificates across five independent evidence sources — visual forensics, OCR/typography,
document structure, metadata, and text consistency — and returns a **forensic risk assessment**: an
authenticity score, a risk level, the specific regions that triggered concern, a likely manipulation
type, and a human-readable explanation.

**This is a research/hackathon prototype, not an official government verification service**, and all
identity/certificate sample documents in this repo are synthetic and fictional (see [`DATASETS.md`](DATASETS.md)).

## Why forensic investigation, not classification

```
Upload → Analyze → Localize → Diagnose → Explain → Compare → Verify
```

Most forgery detectors output a single number. DocuVerify shows *where* the suspicious signal is
(region-level bounding boxes on the actual document), *what kind* of manipulation is suspected (text
replacement, typography inconsistency, copy-paste, metadata anomaly, semantic inconsistency), and *why*
(an explanation traced back to structured evidence — never invented by an LLM). The output is designed
to support a human reviewer's decision, not replace it.

## Architecture

```
Document (PDF/PNG/JPG)
  │
  ▼
Preprocessing (page render, EXIF-aware orientation)
  │
  ▼
Document boundary detection + perspective correction
  │
  ▼
OCR (EasyOCR → pytesseract → unavailable, graceful fallback chain)
  │
  ├──► Visual forensics    (ELA, noise residual, copy-move, OCR-localized comparison)
  ├──► Typography analysis (glyph height / ink density, robust z-scores, font-size clustering)
  ├──► Layout/structure    (line-spacing regularity, margin checks)
  ├──► Metadata            (EXIF / PDF doc-info, never treats "missing" as suspicious)
  └──► Semantic consistency(date-relationship checks, repeated-identifier checks)
        │
        ▼
  Evidence fusion (weighted heuristic, or trained Logistic Regression — see MODEL_CARD.md)
        │
        ▼
  Structured evidence object → Explainability engine (template, or optional LLM narration)
        │
        ▼
  Authenticity score · Risk level · Suspicious regions · Explanation
```

Every stage is wrapped so one engine failing never takes down the whole analysis (see
`app/services/pipeline.py`) — if OCR is unavailable, or the LLM key is unset, or a signal can't be
computed, the pipeline degrades gracefully and says so rather than crashing or fabricating a result.

## Tech stack

- **Backend:** FastAPI, SQLAlchemy + SQLite, OpenCV, PyMuPDF, EasyOCR, scikit-learn
- **Frontend:** React + Vite + TypeScript + Tailwind CSS + Framer Motion + Recharts-ready
- **ML:** Classical CV forensics (ELA, noise residuals, copy-move block matching) + OCR-derived
  statistical heuristics + an optional lightweight Logistic Regression evidence-fusion model
- **Explainability:** Deterministic template by default; optional Groq/Gemini free-tier LLM narration
  of the *already-computed* evidence (the LLM never decides authenticity itself)

## Project structure

```
DocuVerify/
├── backend/            FastAPI app (app/api, app/services/<engine>, app/models, app/schemas)
├── frontend/            React/Vite/TS/Tailwind app
├── scripts/             dataset generation, splitting, forgery generation, evaluation, training
├── data/
│   ├── synthetic/       generated genuine + forged documents (primary dataset, see DATASETS.md)
│   ├── raw/              placeholder for optional external datasets (unused in this build)
│   └── uploads/          runtime upload storage (gitignored)
├── ml/models/            trained fusion-model artifacts + evaluation reports
├── evaluation/          real evaluation results (results.json, report.md)
├── demo/                 curated sample documents for the demo flow
├── DATASETS.md, MODEL_CARD.md, SECURITY.md, FINAL_REPORT.md
```

## Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # optional: only needed for LLM-narrated explanations
uvicorn app.main:app --reload --port 8000
```
The API is then live at `http://localhost:8000` (interactive docs at `/docs`).

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. The Vite dev server proxies `/api` and `/uploads` to `http://localhost:8000`.

### Dataset (primary, synthetic)
```bash
python scripts/generate_synthetic_documents.py --count 40
python scripts/generate_forgeries.py
python scripts/prepare_datasets.py
```

### Evaluation / optional trained fusion model
```bash
python scripts/evaluate.py                # writes evaluation/results.json + report.md
python scripts/train_fusion_model.py       # optional Logistic Regression fusion model, trained on train split, reported on val
```

## Environment variables

See [`backend/.env.example`](backend/.env.example). All are optional — the product works fully offline
with zero configuration:

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `groq` or `gemini` — enables LLM-narrated explanations (free tiers). Leave blank for the built-in deterministic template. |
| `LLM_API_KEY` | API key for the chosen provider. Never commit this. |
| `LLM_MODEL` | Optional model override (defaults to a small/fast free-tier model per provider). |

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/documents/upload` | Upload a PDF/PNG/JPG |
| `POST /api/documents/{id}/analyze` | Run the full forensic pipeline |
| `GET /api/documents/{id}` | Document metadata |
| `GET /api/documents/{id}/results` | Full analysis result (score, evidence, regions, explanation) |
| `GET /api/documents/{id}/regions` | Just the flagged regions |
| `GET /api/documents/{id}/report` | Human-readable report + disclaimer |
| `GET /api/documents/{id}/file` | The document's primary page as PNG (for the viewer) |
| `GET /api/health` | Liveness + OCR-availability check |

## Demo flow

1. Landing page → **Try a Sample Document** (or drag-and-drop your own PDF/PNG/JPG).
2. Watch the live analysis progress (OCR → visual forensics → typography → structure → metadata →
   consistency → fusion → explanation).
3. Results dashboard: authenticity score gauge, risk level, evidence breakdown by signal.
4. Document viewer: click a highlighted region to see exactly why it was flagged.
5. Explanation panel: plain-language summary, likely manipulation type, recommended human checks.

## Honest limitations

- Evaluated only on this project's own synthetic dataset (see `DATASETS.md`) — not validated against
  real-world scanned/photographed documents.
- Current heuristic evidence-fusion weights are hand-picked, not rigorously calibrated; measured
  ROC-AUC on the held-out synthetic test set is 0.565 — a real but weak signal, not a strong classifier
  (see `MODEL_CARD.md` for the honest numbers, including how it started at chance and what fixed it).
  Calibrating the fusion weights properly remains the top priority for further work.
- No connection to any real government identity database — by design, not as a missing feature.
- English-only OCR/text heuristics.

Full details: [`MODEL_CARD.md`](MODEL_CARD.md), [`SECURITY.md`](SECURITY.md), [`FINAL_REPORT.md`](FINAL_REPORT.md).

## Team

Built for a 24-hour hackathon by [ethical0101](https://github.com/ethical0101).

## License

See [`LICENSE`](LICENSE).
