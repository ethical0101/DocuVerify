import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Terminal, ShieldAlert } from "lucide-react";

interface StepDetail {
  label: string;
  description: string;
  logs: string[];
}

const STEPS: StepDetail[] = [
  { 
    label: "Document Intake", 
    description: "Ingesting document binary & reading EXIF streams...",
    logs: [
      "[INFO] Connection established with intake gateway.",
      "[INFO] Reading document byte array.",
      "[OK] File successfully registered: category resolved.",
    ] 
  },
  { 
    label: "OCR Text Extraction", 
    description: "Running EasyOCR CRAFT character detection...",
    logs: [
      "[INFO] Booting neural text extraction model (CRAFT + CRNN).",
      "[INFO] Scanning page boundaries for character regions.",
      "[OK] Extracted text blocks: OCR coordinates resolved.",
    ] 
  },
  { 
    label: "Visual Forensics", 
    description: "Analyzing noise variance & compression traces...",
    logs: [
      "[INFO] Executing Error Level Analysis (ELA).",
      "[INFO] Checking Laplacian variance (edge-blur profiles).",
      "[INFO] Testing copy-move block boundaries.",
      "[OK] Visual anomalies mapping completed.",
    ] 
  },
  { 
    label: "Typography Inspection", 
    description: "Analyzing glyph height & font size outliers...",
    logs: [
      "[INFO] Clustering text regions by glyph dimensions.",
      "[INFO] Evaluating ink density signatures.",
      "[OK] Typography uniformity profile generated.",
    ] 
  },
  { 
    label: "Structural Geometry", 
    description: "Evaluating line grids & margin layout alignment...",
    logs: [
      "[INFO] Projecting horizontal bounding box distributions.",
      "[INFO] Measuring margin deviations.",
      "[OK] Alignment grid verified against layouts.",
    ] 
  },
  { 
    label: "Metadata Audit", 
    description: "Inspecting EXIF profiles & editor signatures...",
    logs: [
      "[INFO] Checking document software metadata history.",
      "[INFO] Parsing modified date timestamps.",
      "[OK] Metadata audit resolved (no blocking errors).",
    ] 
  },
  { 
    label: "Text Consistency", 
    description: "Validating cross-field identifiers & dates...",
    logs: [
      "[INFO] Matching date sequences.",
      "[INFO] Checking repeated strings & registration keys.",
      "[OK] Natural language validation completed.",
    ] 
  },
  { 
    label: "Evidence Fusion", 
    description: "Fusing independent signals via Logistic Regression...",
    logs: [
      "[INFO] Fusing 5 forensic layer outputs.",
      "[INFO] Applying corroboration weights.",
      "[OK] Forensic risk scoring complete. Report compiled.",
    ] 
  },
];

export default function AnalyzingScreen() {
  const [activeStep, setActiveStep] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Speed up step changes slightly to feel snappy but clinical (1000ms per step)
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((s) => {
        if (s < STEPS.length - 1) {
          return s + 1;
        }
        clearInterval(stepInterval);
        return s;
      });
    }, 1200);

    return () => clearInterval(stepInterval);
  }, []);

  // Sync logs in real-time as steps activate
  useEffect(() => {
    const currentStep = STEPS[activeStep];
    if (!currentStep) return;

    // Output logs one by one for this step
    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < currentStep.logs.length) {
        setTerminalLogs((prev) => [...prev, currentStep.logs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(logInterval);
      }
    }, 300);

    return () => clearInterval(logInterval);
  }, [activeStep]);

  // Scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 lg:p-12 bg-ink-950 cyber-grid">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-6 glass gradient-border rounded-2xl p-6 lg:p-8 relative overflow-hidden border border-border/80">
        
        {/* Sonar scanning overlay glow */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-accent/40 shadow-lg shadow-accent animate-pulse" />

        {/* Left Column: Interactive Forensic Checklist */}
        <div className="space-y-6 flex flex-col justify-between pr-0 lg:pr-6 lg:border-r border-border/40">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
                <Loader2 className="w-4.5 h-4.5 text-accent-bright animate-spin" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">REAL-TIME FORENSIC PIPELINE</div>
                <h2 className="text-lg font-bold text-white tracking-tight">Multi-Layer Signal Audit</h2>
              </div>
            </div>
            
            <div className="space-y-3.5 mt-6">
              {STEPS.map((step, idx) => {
                const isActive = idx === activeStep;
                const isCompleted = idx < activeStep;
                
                return (
                  <div 
                    key={step.label} 
                    className={`flex items-start gap-3 text-sm p-2 rounded-lg transition-all duration-200 ${
                      isActive ? "bg-white/[0.02] border border-border/40" : "border border-transparent"
                    }`}
                  >
                    <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isCompleted 
                        ? "bg-risk-low/10 text-risk-low border border-risk-low/30" 
                        : isActive 
                          ? "bg-accent/15 text-accent-bright border border-accent/40" 
                          : "bg-white/[0.02] text-white/20 border border-border/20"
                    }`}>
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      ) : isActive ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`font-semibold tracking-tight ${
                        isActive ? "text-white" : isCompleted ? "text-white/70" : "text-white/30"
                      }`}>{step.label}</div>
                      {isActive && (
                        <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] font-mono text-white/30 flex items-center gap-1.5 pt-4 border-t border-border/20">
            <ShieldAlert className="w-3.5 h-3.5 text-accent-bright" />
            <span>DO NOT NAVIGATE AWAY · SYSTEM PIPELINE ACTIVE</span>
          </div>
        </div>

        {/* Right Column: Live Ingestion Log Terminal */}
        <div className="flex flex-col h-[400px] lg:h-auto bg-black/40 border border-border rounded-xl overflow-hidden font-mono text-[11px] leading-relaxed shadow-inner">
          <div className="bg-ink-900 border-b border-border/60 px-4 py-2.5 flex items-center gap-2 text-white/40 select-none">
            <Terminal className="w-3.5 h-3.5 text-accent-bright" />
            <span>forensic_scan_console.log</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin text-white/70">
            <AnimatePresence>
              {terminalLogs.map((log, idx) => {
                const isOk = log.startsWith("[OK]");
                const isInfo = log.startsWith("[INFO]");
                
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className={isOk ? "text-risk-low" : isInfo ? "text-white/50" : "text-white/80"}
                  >
                    {log}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={terminalEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
