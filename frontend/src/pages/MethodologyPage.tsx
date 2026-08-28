import { useState } from "react";
import { ChevronDown } from "lucide-react";

const STAGES = [
  { name: "Preprocessing", tech: "PyMuPDF (PDF render), Pillow (EXIF orientation)",
    input: "Uploaded PDF/PNG/JPG", output: "Normalized page image",
    detail: "Renders PDF pages to images and corrects EXIF orientation. No external binaries required." },
  { name: "OCR", tech: "EasyOCR (CRAFT detector + CRNN recognizer), pytesseract fallback",
    input: "Page image", output: "Text + bounding boxes + confidence per word",
    detail: "Falls back gracefully to pytesseract, or reports OCR unavailable, if EasyOCR can't run." },
  { name: "Computer Vision (Visual Forensics)", tech: "OpenCV: Error Level Analysis, noise-residual "
      + "statistics, edge-sharpness/ringing (Laplacian variance), copy-move block matching",
    input: "Page image + OCR word boxes", output: "Per-region anomaly scores + bounding boxes",
    detail: "Compares each OCR word's compression/noise/sharpness signature against the document's own "
      + "robust (median/MAD) baseline, clustered by glyph height so legitimately mixed font sizes don't "
      + "register as false anomalies." },
  { name: "Typography", tech: "OCR-box statistics: glyph height, ink density, robust z-scores",
    input: "Page image + OCR word boxes", output: "Typography-inconsistency regions",
    detail: "Clusters words by height and flags outliers within their own cluster." },
  { name: "Structure", tech: "OCR-box geometry statistics",
    input: "OCR word boxes", output: "Line-spacing/margin anomaly findings",
    detail: "Checks line-spacing regularity and margin conventions." },
  { name: "Metadata", tech: "EXIF (Pillow) / PDF doc-info (PyMuPDF)",
    input: "Original file", output: "Metadata fields + editor-signature check",
    detail: "Missing metadata is reported neutrally, never treated as suspicious on its own." },
  { name: "NLP / Consistency", tech: "Regex-based date/identifier extraction and cross-checks",
    input: "OCR text", output: "Date-relationship and repeated-identifier findings",
    detail: "Checks for implausible date relationships and conflicting repeated identifiers." },
  { name: "Evidence Fusion", tech: "Transparent weighted average (documented, hand-picked weights); "
      + "optional trained Logistic Regression alternative",
    input: "Five 0-1 anomaly signals", output: "Authenticity score, forensic risk, confidence, risk level",
    detail: "Two independent engines flagging overlapping regions apply a small, capped corroboration "
      + "bonus. See MODEL_CARD.md for honest evaluation numbers." },
  { name: "Explainable AI", tech: "Deterministic template by default; optional Groq/Gemini free-tier "
      + "LLM narration of the same structured evidence",
    input: "Fused evidence + evidence list", output: "WHAT/WHY-grounded summary + recommended checks",
    detail: "The LLM (if configured) narrates evidence it is given -- it never decides authenticity and "
      + "never invents findings." },
];

export default function MethodologyPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">How DocuVerify Investigates a Document</h1>
      <p className="text-white/50 text-sm mb-8">
        Every stage below is actually implemented and running in this build -- nothing here is aspirational.
      </p>

      <div className="space-y-2">
        {STAGES.map((s, i) => (
          <div key={s.name} className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white/30 w-5">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-medium">{s.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className="px-5 pb-5 pl-13 space-y-2 text-sm">
                <Row label="Technology" value={s.tech} />
                <Row label="Input" value={s.input} />
                <Row label="Output" value={s.output} />
                <p className="text-white/60 leading-relaxed pt-1">{s.detail}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/40 text-xs uppercase tracking-wide">{label}: </span>
      <span className="text-white/80">{value}</span>
    </div>
  );
}
