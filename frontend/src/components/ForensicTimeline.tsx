import { Check } from "lucide-react";
import { STAGE_ORDER, STAGE_LABELS, type StageKey } from "../api/client";

export default function ForensicTimeline({
  currentIndex, onSelect,
}: { currentIndex: number; onSelect: (idx: number) => void }) {
  return (
    <div className="glass rounded-xl p-4 border border-border/60 flex flex-col h-full bg-white/[0.01]">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 font-mono mb-4 hidden lg:block">
        ANALYSIS WORKSPACE
      </div>
      
      <div className="flex lg:flex-col gap-1.5 overflow-x-auto scrollbar-thin pb-2 lg:pb-0">
        {STAGE_ORDER.map((stage: StageKey, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const reachable = i <= currentIndex;
          
          return (
            <button
              key={stage}
              disabled={!reachable}
              onClick={() => onSelect(i)}
              className={`flex items-center gap-2.5 pl-3.5 pr-3 py-2.5 rounded-lg text-xs text-left whitespace-nowrap shrink-0 border transition-all cursor-pointer duration-150 ${
                current
                  ? "bg-accent/15 text-white font-semibold border-accent/40 shadow-sm shadow-accent/5"
                  : reachable 
                    ? "text-white/60 font-medium border-transparent hover:border-white/10 hover:bg-white/[0.02]" 
                    : "text-white/20 border-transparent cursor-not-allowed"
              }`}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono transition-all ${
                  done 
                    ? "bg-risk-low/20 text-risk-low border border-risk-low/40" 
                    : current 
                      ? "bg-accent border border-accent text-white" 
                      : "bg-white/5 border border-border/40 text-white/40"
                }`}>
                  {done ? (
                    <Check className="w-3 h-3" strokeWidth={3.5} />
                  ) : current ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </span>
              </div>
              <span className="tracking-tight">{STAGE_LABELS[stage]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
