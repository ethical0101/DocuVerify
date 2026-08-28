import { Check } from "lucide-react";
import { STAGE_ORDER, STAGE_LABELS, type StageKey } from "../api/client";

export default function ForensicTimeline({
  currentIndex, onSelect,
}: { currentIndex: number; onSelect: (idx: number) => void }) {
  return (
    <div className="glass rounded-xl p-4 lg:p-5">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-4 hidden lg:block">Investigation Timeline</div>
      <div className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-thin">
        {STAGE_ORDER.map((stage: StageKey, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const reachable = i <= currentIndex;
          return (
            <button
              key={stage}
              disabled={!reachable}
              onClick={() => onSelect(i)}
              className={`flex items-center gap-2.5 pl-3 pr-3.5 py-2.5 rounded-lg text-sm text-left whitespace-nowrap shrink-0 border-l-2 transition-all ${
                current
                  ? "bg-accent/15 text-white font-semibold border-accent shadow-[0_0_0_1px_rgba(91,143,255,0.3)]"
                  : reachable ? "text-white/70 font-medium border-transparent hover:bg-white/5" : "text-white/25 border-transparent"
              }`}
            >
              <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                done ? "bg-risk-low text-ink-950" : current ? "bg-accent text-white" : "bg-white/10"
              }`}>
                {done ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : current ? "" : ""}
                {current && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              {STAGE_LABELS[stage]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
