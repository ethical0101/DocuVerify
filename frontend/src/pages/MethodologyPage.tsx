import { useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";

const STAGES = [
  { 
    name: "Preprocessing", 
    tech: "PyMuPDF (PDF rendering), Pillow (EXIF orientation)",
    input: "Uploaded PDF/PNG/JPG file stream", 
    output: "Normalized RGB page image",
    detail: "Standardizes orientation metadata, rescales dimensions, and renders multi-page PDF pages to clean PNG objects to ensure uniform feature extraction coordinates." 
  },
  { 
    name: "OCR Text Extraction", 
    tech: "EasyOCR (CRAFT character detector & CRNN recognizer), pytesseract fallback",
    input: "Page image matrix", 
    output: "Bounding boxes + character strings + confidence scores",
    detail: "Detects text fields across character grids. Falls back gracefully to system pytesseract or registers OCR unavailable if libraries fail to initialize." 
  },
  { 
    name: "Computer Vision (Visual Forensics)", 
    tech: "OpenCV: Error Level Analysis, noise-residual statistics, edge Laplacian variance, copy-move matching",
    input: "Page image + OCR bounding box grid", 
    output: "Per-word anomaly variance scores",
    detail: "Compares each OCR text field's digital signature (compression, noise frequency, edge blur profiles) against the document's median baseline to detect regional edits." 
  },
  { 
    name: "Typography Inspection", 
    tech: "OCR geometry metrics: relative height, width aspect ratios, ink density statistics",
    input: "OCR bounding box coordinates", 
    output: "Typographical size outlier regions",
    detail: "Groups words by baseline height, checking for outliers within font size clusters to detect replaced characters." 
  },
  { 
    name: "Structural Layout Check", 
    tech: "Spatial bounding box margin coordinates",
    input: "OCR bounding box coordinates", 
    output: "Margin alignment alerts",
    detail: "Validates margins and paragraph structures to identify block-level copy-paste displacements." 
  },
  { 
    name: "Metadata Audit", 
    tech: "EXIF parsing & Adobe PDF trailer signature stream scanner",
    input: "Original document file binary", 
    output: "EXIF parameter lists + editor stamp warning flags",
    detail: "Checks for editing software signatures (e.g. Photoshop, Illustrator) and mismatching modification dates." 
  },
  { 
    name: "Natural Language Consistency", 
    tech: "Regex sequences & date/identifier value correlation check",
    input: "Extracted raw OCR string values", 
    output: "Cross-field date conflicts or key duplicate alerts",
    detail: "Checks date order logic and matching registration codes to detect logical fraud." 
  },
  { 
    name: "Evidence Fusion", 
    tech: "Logistic Regression estimator trained on engineered forensic features",
    input: "Independent anomaly vector scores", 
    output: "Authenticity rating (0-100), risk warning class, confidence score",
    detail: "Applies trained Logistic Regression weights to combine signals. Includes corroboration bonuses if anomalies overlap." 
  },
  { 
    name: "Narrative Narrator (XAI)", 
    tech: "Deterministic format mapper & optional Groq Llama-3 / Gemini narrator",
    input: "Fused evidence logs", 
    output: "Natural language explanations + suggested human checklist items",
    detail: "Translates abstract numerical scores into clear WHAT, WHY, and WHERE descriptions for human reviewers." 
  },
];

export default function MethodologyPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-accent" /> FORMS AND PROTOCOLS
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Methodology &amp; Engine Pipeline</h1>
        <p className="text-white/50 text-sm mt-1">
          DocuVerify treats verification as a multi-signal investigation. Below is our processing architecture.
        </p>
      </div>

      {/* Accordion Stepper */}
      <div className="space-y-3">
        {STAGES.map((s, i) => {
          const isOpen = open === i;
          
          return (
            <div 
              key={s.name} 
              className={`glass rounded-xl overflow-hidden border transition-all duration-300 ${
                isOpen ? "border-accent/50 bg-gradient-to-r from-accent/5 to-transparent" : "border-border/60 bg-white/[0.01]"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4.5 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                    isOpen ? "bg-accent/15 text-accent-bright border border-accent/25" : "bg-white/5 border border-border text-white/30"
                  }`}>
                    STAGE {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-bold text-white tracking-tight text-sm">{s.name}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              
              {isOpen && (
                <div className="px-5 pb-5 pl-5 sm:pl-16 space-y-3.5 text-xs border-t border-border/20 pt-4 bg-black/10">
                  <Row label="Technology Stack" value={s.tech} />
                  <Row label="Input Type" value={s.input} />
                  <Row label="Output Type" value={s.output} />
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">FUNCTIONAL DESCRIPTION</span>
                    <p className="text-white/70 leading-relaxed font-sans">{s.detail}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 border-b border-border/20 pb-2 last:border-0 last:pb-0">
      <span className="text-white/35 text-[10px] font-bold uppercase tracking-widest font-mono">{label}</span>
      <p className="text-white/80 font-mono text-[11px] leading-relaxed break-words">{value}</p>
    </div>
  );
}
