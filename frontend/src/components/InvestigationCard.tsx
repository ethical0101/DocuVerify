import { useNavigate } from "react-router-dom";
import { FileText, Calendar, ChevronRight } from "lucide-react";
import type { InvestigationSummary } from "../api/client";

const RISK_COLOR: Record<string, string> = { LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#ef4444" };

export default function InvestigationCard({ item }: { item: InvestigationSummary }) {
  const navigate = useNavigate();
  const color = RISK_COLOR[item.risk_level] ?? "#3b82f6";
  const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <button
      onClick={() => navigate(`/report/${item.id}`)}
      className="w-full text-left glass rounded-xl p-4 flex items-center justify-between gap-4 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-accent-bright group-hover:scale-105 transition-transform duration-200">
          <FileText className="w-5 h-5 text-accent-bright" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="text-sm font-bold text-white/95 truncate group-hover:text-white transition-colors">{item.filename}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-mono uppercase tracking-wider">
            <span>CASE: {item.case_number}</span>
            <span>&middot;</span>
            <span>{item.category}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 shrink-0">
        {/* Date Ingested */}
        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
          <Calendar className="w-3.5 h-3.5 text-white/20" />
          <span>INGESTED: {dateStr}</span>
        </div>

        {/* Authenticity Index */}
        <div className="text-right hidden sm:block">
          <div className="text-sm font-black text-white font-mono">{item.authenticity_score.toFixed(0)}/100</div>
          <div className="text-[9px] text-white/30 font-mono uppercase tracking-wide">authenticity</div>
        </div>

        {/* Severity risk rating */}
        <span 
          className="text-[9px] font-bold font-mono px-2.5 py-1 rounded-full border uppercase tracking-wider text-center w-24 shrink-0"
          style={{ color, background: `${color}15`, borderColor: `${color}30` }}
        >
          {item.risk_level} RISK
        </span>

        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </button>
  );
}
