import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass rounded-2xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Loader2 className="w-8 h-8 text-accent mx-auto animate-spin mb-3" />
          <div className="font-medium">Running forensic analysis</div>
        </div>
        <div className="space-y-3">
          {STEPS.map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: i <= step ? 1 : 0.3 }}
              className="flex items-center gap-3 text-sm"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                i < step ? "bg-risk-low/20 text-risk-low" : i === step ? "bg-accent/20 text-accent" : "bg-white/5 text-white/20"
              }`}>
                {i < step ? <Check className="w-3 h-3" /> : i === step ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              </div>
              <span className={i <= step ? "text-white/80" : "text-white/30"}>{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
