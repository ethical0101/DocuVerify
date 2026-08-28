import type { Evidence } from "../api/client";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#f87171", high: "#f87171", medium: "#fbbf24", low: "#facc15", info: "#8b93ab",
};

export default function FindingList({
  findings, selectedIndex, onSelect,
}: { findings: Evidence[]; selectedIndex: number | null; onSelect: (idx: number) => void }) {
  if (findings.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-white/50 text-sm">
        No significant findings were flagged for this document.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-4">Key Findings ({findings.length})</div>
      <div className="space-y-2">
        {findings.map((f, i) => {
          const color = SEVERITY_COLOR[f.severity] ?? "#8b93ab";
          return (
            <button
              key={f.id}
              onClick={() => onSelect(i)}
              className={`w-full text-left flex items-center gap-3 rounded-lg p-3 transition border ${
                selectedIndex === i ? "border-white/30 bg-white/5" : "border-transparent hover:bg-white/5"
              }`}
            >
              <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: color }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {i + 1}. {f.matched_text ? `"${f.matched_text}"` : f.title}
                </div>
                <div className="text-xs text-white/40 truncate">{f.title}</div>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full uppercase shrink-0"
                    style={{ color, background: `${color}1a` }}>
                {f.severity}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
