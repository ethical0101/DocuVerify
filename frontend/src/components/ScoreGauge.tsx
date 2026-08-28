const RISK_COLOR: Record<string, string> = { LOW: "#34d399", MEDIUM: "#fbbf24", HIGH: "#f87171" };

export default function ScoreGauge({ score, risk, confidence }: { score: number; risk: string; confidence: number }) {
  const color = RISK_COLOR[risk] ?? "#94a3b8";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="glass rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-8">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2740" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-semibold">{score.toFixed(0)}%</div>
          <div className="text-[10px] uppercase tracking-wide text-white/40">Authenticity</div>
        </div>
      </div>

      <div className="flex-1 w-full">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-2">Forensic Risk Assessment</div>
        <div className="text-2xl font-semibold mb-3" style={{ color }}>{risk} RISK</div>
        <div className="flex items-center gap-2 text-sm text-white/50">
          <span>Confidence</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[160px]">
            <div className="h-full bg-accent" style={{ width: `${confidence}%` }} />
          </div>
          <span className="font-mono text-white/70">{confidence.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
