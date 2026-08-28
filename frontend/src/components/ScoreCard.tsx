const RISK_COLOR: Record<string, string> = { LOW: "#34d399", MEDIUM: "#fbbf24", HIGH: "#f87171" };

export default function ScoreCard({
  authenticity, risk, riskLevel, confidence,
}: { authenticity: number; risk: number; riskLevel: string; confidence: number }) {
  const color = RISK_COLOR[riskLevel] ?? "#94a3b8";

  return (
    <div className="glass rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
      <Metric label="Authenticity" value={`${authenticity.toFixed(0)}`} suffix="/ 100"
              barValue={authenticity} barColor="#4f8cff" />
      <div className="sm:border-x sm:border-white/10 sm:px-6">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-1">Forensic Risk</div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-semibold" style={{ color }}>{risk.toFixed(0)}</span>
          <span className="text-white/40 text-sm">/ 100</span>
        </div>
        <div className="inline-block text-xs font-medium px-2.5 py-1 rounded-full"
             style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}>
          {riskLevel} RISK
        </div>
      </div>
      <Metric label="Assessment Confidence" value={`${confidence.toFixed(0)}`} suffix="%"
              barValue={confidence} barColor="#a78bfa"
              note={confidence < 60 ? "Limited evidence available -- interpret with caution" : undefined} />
    </div>
  );
}

function Metric({ label, value, suffix, barValue, barColor, note }: {
  label: string; value: string; suffix: string; barValue: number; barColor: string; note?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-white/40 mb-1">{label}</div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-semibold">{value}</span>
        <span className="text-white/40 text-sm">{suffix}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${barValue}%`, background: barColor }} />
      </div>
      {note && <div className="text-[11px] text-white/40 mt-1.5">{note}</div>}
    </div>
  );
}
