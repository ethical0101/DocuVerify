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
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap shrink-0 transition ${
                current ? "bg-accent/15 text-accent" : reachable ? "text-white/70 hover:bg-white/5" : "text-white/25"
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                done ? "bg-risk-low/20 text-risk-low" : current ? "bg-accent/20 text-accent" : "bg-white/5"
              }`}>
                {done ? <Check className="w-2.5 h-2.5" /> : current ? "●" : "○"}
              </span>
              {STAGE_LABELS[stage]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
