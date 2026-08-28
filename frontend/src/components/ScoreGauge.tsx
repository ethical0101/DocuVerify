const RISK_COLOR: Record<string, string> = { LOW: "#16a34a", MEDIUM: "#d97706", HIGH: "#dc2626" };
const RISK_BG: Record<string, string> = { LOW: "#16a34a1a", MEDIUM: "#d977061a", HIGH: "#dc26261a" };

export default function ScoreGauge({ score, risk, confidence }: { score: number; risk: string; confidence: number }) {
  const color = RISK_COLOR[risk] ?? "#0b66c3";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="card p-8 flex flex-col sm:flex-row items-center gap-8">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e2f0fc" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-brand-900">{score.toFixed(0)}%</div>
          <div className="text-[10px] uppercase tracking-wide text-muted">Authenticity</div>
        </div>
      </div>

      <div className="flex-1 w-full">
        <div className="text-xs uppercase tracking-wide text-brand-600 font-semibold mb-2">Forensic Risk Assessment</div>
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-lg font-bold mb-4"
          style={{ color, background: RISK_BG[risk] ?? "#0b66c31a" }}>
          {risk} RISK
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>Confidence</span>
          <div className="flex-1 h-2 bg-brand-100 rounded-full overflow-hidden max-w-[200px]">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${confidence}%` }} />
          </div>
          <span className="font-mono text-brand-900 font-medium">{confidence.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
