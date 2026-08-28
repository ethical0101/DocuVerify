# Demo Script (~3 minutes)

Sample documents live in `demo/identity/` and `demo/certificate/` (also served to the frontend via
`frontend/public/samples/` for the one-click "Try a Sample Document" buttons). All are synthetic and
fictional — see `DATASETS.md`.

## 1. Genuine identity document (~30s)
- Landing page → **Try a Sample Document**, or Upload → **Sample: genuine ID**.
- Expect: LOW-to-MEDIUM risk, few or no flagged regions, explanation notes no strong manipulation
  signal was found.

## 2. Manipulated identity document (~60s)
- Upload → **Sample: forged ID** (`demo/identity/forged_text.png` — the name field was replaced and
  re-compressed to mimic a real paste/edit).
- Expect: risk elevated vs. the genuine sample; the name field region is highlighted.
- **"Let's see why."** Click the highlighted region in the document viewer.
- Side panel shows: manipulation type (text replacement / typography inconsistency / compression-splice),
  confidence, and the specific reason (e.g. "Compression/noise fingerprint on this text region differs
  from the document's own surrounding text" or "This region shows a JPEG block-compression grid that the
  rest of the document does not").

## 3. Forged certificate (~45s)
- Upload → **Sample: forged certificate** (`demo/certificate/forged_name.png` or `forged_date.png`).
- Highlight the changed name/date field and its evidence.

## 4. Evidence breakdown & explanation (~30s)
- Point out the Evidence Breakdown panel (visual / typography / structure / text consistency / metadata)
  and the plain-language explanation panel underneath — emphasize that the explanation is generated
  *from* the structured evidence object (deterministic template by default; optionally LLM-narrated, but
  the LLM never invents findings — see `docs/architecture.md`).

## 5. Honest limitations callout (~15s)
- Note the disclaimer footer on every results page and in `MODEL_CARD.md`: this is a forensic
  risk-assessment prototype for a human reviewer, not an official verification service, and its current
  aggregate accuracy on the held-out synthetic test set is documented honestly (not oversold) in
  `evaluation/report.md`.

## Fallback if the backend/LLM is unavailable
- The pipeline runs fully offline; no external API is required for the demo. If OCR itself is
  unavailable in a given environment, the app still returns a graceful result noting which signals
  could not be computed rather than crashing (see `SECURITY.md` / `MODEL_CARD.md` fallback behavior).
