import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import type { InvestigationSummary } from "../api/client";

const RISK_COLOR: Record<string, string> = { LOW: "#34d399", MEDIUM: "#fbbf24", HIGH: "#f87171" };

export default function InvestigationCard({ item }: { item: InvestigationSummary }) {
  const navigate = useNavigate();
  const color = RISK_COLOR[item.risk_level] ?? "#8b93ab";

  return (
    <button
      onClick={() => navigate(`/report/${item.id}`)}
      className="w-full text-left glass rounded-xl p-4 flex items-center justify-between gap-4 hover:border-white/20 transition"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-white/50" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{item.filename}</div>
          <div className="text-xs text-white/40 font-mono">{item.case_number} &middot; {item.category}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-mono">{item.authenticity_score.toFixed(0)}/100</div>
          <div className="text-[10px] text-white/40">authenticity</div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}>
          {item.risk_level}
        </span>
      </div>
    </button>
  );
}
