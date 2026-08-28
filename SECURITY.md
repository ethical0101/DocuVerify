# Security

## File handling
- Uploads are restricted to `.pdf`, `.png`, `.jpg`, `.jpeg` (checked by extension and re-validated by
  the image/PDF decoder itself — a malformed or renamed file fails to decode rather than being trusted).
- Upload size is capped (`MAX_UPLOAD_MB`, default 25MB).
- Uploaded files are renamed to a random UUID-based filename on disk (`app/api/routes.py`) — the
  original filename is stored only as metadata, never used as a path, which rules out path traversal
  via a crafted filename.
- Uploaded files are never executed, parsed as code, or passed to a shell. PDF rendering uses PyMuPDF
  (a pure library call, no external `pdftoppm`/poppler subprocess).
- The SHA-256 of every upload is recorded, giving a basic tamper-evidence / dedup fingerprint.

## Secrets
- No secrets are committed to this repository. `.env.example` lists the only configurable secret
  (`LLM_API_KEY`, optional). `.env` is gitignored.
- The LLM integration is entirely optional; with no key configured, the explainability engine falls
  back to a deterministic, template-based explanation and the product works fully offline.

## API surface
- CORS is currently permissive (`*`) for hackathon demo convenience — this should be restricted to a
  known frontend origin before any real deployment.
- No authentication/authorization layer exists yet — this is a single-user local/demo prototype, not
  a multi-tenant service. Do not deploy this as-is to handle real personal documents at scale.
- No connection is made to any government identity database (Aadhaar, Passport Seva, DMV, etc.) — this
  is a forensic-signal prototype, not an official verification integration, by design (see README).

## Privacy
- Documents are processed locally (backend runs on your own machine/server); no document content is
  sent to a third party unless you explicitly configure an LLM provider for the explanation step — and
  even then, only the structured evidence object (scores/regions/labels) is sent, never the raw image.
- All identity/certificate sample documents shipped in this repo are synthetic and fictional
  (see `DATASETS.md`) — no real person's data is included.
- Uploaded documents are stored under `data/uploads/` (gitignored) and are not automatically deleted;
  add a retention/cleanup job before any non-demo use.

## Known limitations (threat model)
- This is a 24-hour hackathon prototype. It has not had a formal security audit or penetration test.
- Classical computer-vision forensic signals (ELA, noise residuals) can be defeated by a sufficiently
  careful forger; they are decision-support signals for a human reviewer, not a guarantee.
- The OCR/typography/layout heuristics are tuned on synthetic renders and may behave differently on
  real scanned/photographed documents (see `MODEL_CARD.md` limitations).
