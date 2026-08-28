import type { RiskLevel } from "../api/client";

const RISK_COLOR: Record<string, string> = { LOW: "#34d399", MEDIUM: "#fbbf24", HIGH: "#f87171" };

export default function CaseHeader({
  caseNumber, filename, category, riskLevel, status,
}: { caseNumber: string; filename: string; category: string; riskLevel?: RiskLevel; status?: string }) {
  const color = riskLevel ? RISK_COLOR[riskLevel] : "#8b93ab";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-xs text-white/40 font-mono mb-1">
          <span>CASE {caseNumber || "PENDING"}</span>
          <span className="text-white/20">&middot;</span>
          <span className="uppercase">{category} document</span>
        </div>
        <h1 className="text-2xl font-semibold truncate max-w-xl">{filename}</h1>
      </div>
      {(riskLevel || status) && (
        <div className="flex items-center gap-2">
          {status && (
            <span className="text-xs px-3 py-1.5 rounded-full glass text-white/60">{status}</span>
          )}
          {riskLevel && (
            <span className="text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}>
              {riskLevel} RISK
            </span>
          )}
        </div>
      )}
    </div>
  );
}
