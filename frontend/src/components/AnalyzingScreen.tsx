import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import PortalHeader from "./PortalHeader";

const STEPS = [
  "Document received",
  "Detecting document boundary",
  "Running OCR",
  "Analyzing visual forensics",
  "Checking typography",
  "Analyzing structure",
  "Inspecting metadata",
  "Checking consistency",
  "Fusing evidence",
  "Generating forensic explanation",
];

export default function AnalyzingScreen() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 550);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <PortalHeader />
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-3">
              <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
            </div>
            <div className="font-semibold text-brand-900">Running forensic analysis</div>
            <div className="text-xs text-muted mt-1">Please wait while we investigate the document</div>
          </div>
          <div className="space-y-3">
            {STEPS.map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: i <= step ? 1 : 0.4 }}
                className="flex items-center gap-3 text-sm"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  i < step ? "bg-risk-low/15 text-risk-low" : i === step ? "bg-brand-100 text-brand-600" : "bg-brand-50 text-brand-200"
                }`}>
                  {i < step ? <Check className="w-3 h-3" /> : i === step ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                </div>
                <span className={i <= step ? "text-ink font-medium" : "text-muted"}>{label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
