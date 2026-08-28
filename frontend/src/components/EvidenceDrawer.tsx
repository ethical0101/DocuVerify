import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, ShieldAlert, ListChecks, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import type { Evidence } from "../api/client";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#ef4444", medium: "#f59e0b", low: "#10b981", info: "#3b82f6",
};

export default function EvidenceDrawer({
  evidence, index, total, onClose, onPrev, onNext,
}: {
  evidence: Evidence | null; index?: number; total?: number;
  onClose: () => void; onPrev?: () => void; onNext?: () => void;
}) {
  const color = evidence ? SEVERITY_COLOR[evidence.severity] ?? "#3b82f6" : "#3b82f6";

  // Framer Motion variants for responsive slide directions
  const sidebarVariants = {
    hidden: { 
      x: "100%", 
      y: 0,
      opacity: 0.95
    },
    visible: { 
      x: 0, 
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, damping: 28, stiffness: 245 } 
    },
    exit: { 
      x: "100%", 
      y: 0,
      opacity: 0.95,
      transition: { ease: "easeInOut" as const, duration: 0.2 } 
    }
  };

  const bottomSheetVariants = {
    hidden: { 
      y: "100%", 
      x: 0,
      opacity: 0.95
    },
    visible: { 
      y: 0, 
      x: 0,
      opacity: 1,
      transition: { type: "spring" as const, damping: 28, stiffness: 245 } 
    },
    exit: { 
      y: "100%", 
      x: 0,
      opacity: 0.95,
      transition: { ease: "easeInOut" as const, duration: 0.2 } 
    }
  };

  return (
    <AnimatePresence>
      {evidence && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Main Drawer Panel */}
          <motion.div
            className="fixed z-50 glass border-border/80 overflow-y-auto scrollbar-thin
                       inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl flex flex-col bg-panel/95
                       lg:inset-y-0 lg:right-0 lg:left-auto lg:bottom-auto lg:h-full lg:max-h-none
                       lg:w-[26rem] lg:rounded-t-none lg:border-l shadow-2xl relative"
            variants={typeof window !== 'undefined' && window.innerWidth >= 1024 ? sidebarVariants : bottomSheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Ambient background glow inside the drawer */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/5 filter blur-3xl pointer-events-none" />

            {/* Header section */}
            <div className="sticky top-0 bg-black/45 backdrop-blur-md px-5 pt-6 pb-4 border-b border-border/40 flex items-start justify-between gap-3 z-10">
              <div>
                {typeof index === "number" && typeof total === "number" && (
                  <div className="text-[10px] font-bold text-white/30 font-mono tracking-widest mb-1.5 uppercase">
                    EVIDENCE FINDING {index + 1} OF {total}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border"
                    style={{ color, background: `${color}15`, borderColor: `${color}35` }}
                  >
                    {evidence.severity} SEVERITY
                  </span>
                  {evidence.corroborated && (
                    <span className="text-[9px] font-mono font-bold text-accent-bright bg-accent/15 border border-accent/25 px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> corroborated
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold mt-2 text-white leading-tight font-sans tracking-tight">
                  {evidence.title}
                </h3>
              </div>
              <button 
                onClick={onClose} 
                className="text-white/45 hover:text-white shrink-0 p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body contents */}
            <div className="p-5 space-y-6 flex-1">
              
              {/* Confidence Progress Meter */}
              {evidence.confidence !== null && (
                <div className="bg-white/[0.01] border border-border/45 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/40">ASSESSMENT CONFIDENCE</span>
                    <span className="font-bold text-white" style={{ color }}>{Math.round((evidence.confidence || 0) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${(evidence.confidence || 0) * 100}%`, 
                        backgroundColor: color,
                        boxShadow: `0 0 8px 1px ${color}`
                      }} 
                    />
                  </div>
                </div>
              )}

              {/* Word locator block */}
              {evidence.matched_text && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 font-mono flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-accent-bright" /> LOCATED SUBSTRING
                  </div>
                  <div className="text-xs font-mono bg-black/45 border border-border rounded-lg px-3 py-2.5 text-white/90 break-all leading-normal inline-block">
                    "{evidence.matched_text}"
                  </div>
                </div>
              )}

              {/* In-depth descriptions */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 font-mono">WHAT WAS FLAG-TRIGGERED</div>
                <p className="text-xs text-white/80 leading-relaxed font-sans">{evidence.summary}</p>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 font-mono flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-risk-high" /> WHY THIS MATTERS
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-sans">{evidence.why_it_matters}</p>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 font-mono flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-risk-low" /> RECOMMENDED HUMAN PROTOCOLS
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-sans bg-white/[0.01] border border-border/40 p-3 rounded-lg">
                  {evidence.recommended_check}
                </p>
              </div>
            </div>

            {/* Footer Navigation Buttons */}
            {(onPrev || onNext) && (
              <div className="sticky bottom-0 bg-black/45 backdrop-blur-md px-5 py-4 border-t border-border/40 flex gap-2.5 z-10 mt-auto">
                <button 
                  onClick={onPrev} 
                  disabled={!onPrev}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/[0.02] hover:bg-white/[0.04] disabled:opacity-20 py-2.5 text-xs font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Previous Alert
                </button>
                <button 
                  onClick={onNext} 
                  disabled={!onNext}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/[0.02] hover:bg-white/[0.04] disabled:opacity-20 py-2.5 text-xs font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  Next Alert <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
