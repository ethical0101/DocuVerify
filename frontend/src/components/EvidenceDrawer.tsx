import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, ShieldAlert, ListChecks } from "lucide-react";
import type { Evidence } from "../api/client";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#f87171", high: "#f87171", medium: "#fbbf24", low: "#facc15", info: "#8b93ab",
};

export default function EvidenceDrawer({
  evidence, index, total, onClose, onPrev, onNext,
}: {
  evidence: Evidence | null; index?: number; total?: number;
  onClose: () => void; onPrev?: () => void; onNext?: () => void;
}) {
  const color = evidence ? SEVERITY_COLOR[evidence.severity] ?? "#8b93ab" : "#8b93ab";

  return (
    <AnimatePresence>
      {evidence && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed z-50 glass border-white/10 overflow-y-auto scrollbar-thin
                       inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl
                       lg:inset-y-0 lg:right-0 lg:left-auto lg:bottom-auto lg:h-full lg:max-h-none
                       lg:w-[26rem] lg:rounded-t-none lg:border-l"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="sticky top-0 glass px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-white/10">
              <div>
                {typeof index === "number" && typeof total === "number" && (
                  <div className="text-[11px] text-white/40 font-mono mb-1">FINDING {index + 1} OF {total}</div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full uppercase"
                        style={{ color, background: `${color}1a` }}>
                    {evidence.severity}
                  </span>
                  {evidence.corroborated && (
                    <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                      corroborated
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold mt-1.5">{evidence.title}</h3>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {evidence.confidence !== null && (
                <div>
                  <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                    <span>Confidence</span><span className="font-mono">{Math.round((evidence.confidence || 0) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(evidence.confidence || 0) * 100}%`, background: color }} />
                  </div>
                </div>
              )}

              {evidence.matched_text && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/40 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Location
                  </div>
                  <div className="text-sm font-mono bg-white/5 rounded px-3 py-2 inline-block">"{evidence.matched_text}"</div>
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-wide text-white/40 mb-1.5">What We Found</div>
                <p className="text-sm text-white/80 leading-relaxed">{evidence.summary}</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/40 mb-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Why This Matters
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{evidence.why_it_matters}</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/40 mb-1.5">
                  <ListChecks className="w-3.5 h-3.5" /> Recommended Human Check
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{evidence.recommended_check}</p>
              </div>

              {(onPrev || onNext) && (
                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <button onClick={onPrev} disabled={!onPrev}
                          className="flex-1 rounded-lg glass py-2 text-sm text-white/70 disabled:opacity-30 hover:text-white">
                    &larr; Previous
                  </button>
                  <button onClick={onNext} disabled={!onNext}
                          className="flex-1 rounded-lg glass py-2 text-sm text-white/70 disabled:opacity-30 hover:text-white">
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
