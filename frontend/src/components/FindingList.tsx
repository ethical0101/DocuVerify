import { Eye, ShieldAlert } from "lucide-react";
import type { Evidence } from "../api/client";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#ef4444", medium: "#f59e0b", low: "#10b981", info: "#3b82f6",
};

export default function FindingList({
  findings, selectedIndex, onSelect,
}: { findings: Evidence[]; selectedIndex: number | null; onSelect: (idx: number) => void }) {
  
  if (findings.length === 0) {
    return (
      <div className="glass rounded-xl p-8 border border-border/60 text-center text-white/45 text-sm">
        <CheckCircleBadge />
        <div className="font-semibold text-white/80 mt-3">Document integrity verified</div>
        <p className="text-xs text-white/40 mt-1">No critical visual or typography anomalies were detected on this file.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 border border-border/60 bg-white/[0.01]">
      <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest mb-4">
        DETECTED ANOMALY KEY LOGS ({findings.length})
      </div>
      
      <div className="space-y-2">
        {findings.map((f, i) => {
          const color = SEVERITY_COLOR[f.severity] ?? "#3b82f6";
          const isSelected = selectedIndex === i;
          
          return (
            <button
              key={f.id}
              onClick={() => onSelect(i)}
              className={`w-full text-left flex items-center gap-4 rounded-lg p-3.5 border transition-all duration-200 cursor-pointer ${
                isSelected 
                  ? "bg-accent/10 border-accent/40 shadow-sm" 
                  : "bg-white/[0.01] border-border/50 hover:border-white/10 hover:bg-white/[0.02]"
              }`}
            >
              {/* Left Color Severity Stripe */}
              <span className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
              
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-mono truncate ${isSelected ? "font-bold text-white" : "text-white/80"}`}>
                  {i + 1}. {f.matched_text ? `"${f.matched_text}"` : f.title}
                </div>
                <div className="text-[10px] text-white/40 truncate mt-0.5 font-sans uppercase tracking-tight">{f.title}</div>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                {isSelected && <Eye className="w-3.5 h-3.5" style={{ color }} />}
                <span 
                  className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider border"
                  style={{ color, background: `${color}15`, borderColor: `${color}30` }}
                >
                  {f.severity}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckCircleBadge() {
  return (
    <div className="w-10 h-10 rounded-full bg-risk-low/10 border border-risk-low/35 flex items-center justify-center mx-auto">
      <ShieldAlert className="w-5 h-5 text-risk-low rotate-180" />
    </div>
  );
}
