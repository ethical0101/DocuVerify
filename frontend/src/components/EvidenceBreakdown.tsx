const LABELS: Record<string, string> = {
  visual_anomaly: "Visual Forensics",
  typography_anomaly: "Typography",
  layout_anomaly: "Structure",
  semantic_anomaly: "Text Consistency",
  metadata_anomaly: "Metadata",
};

function barColor(v: number): string {
  if (v >= 0.6) return "#dc2626";
  if (v >= 0.35) return "#d97706";
  return "#16a34a";
}

export default function EvidenceBreakdown({ evidence }: { evidence: Record<string, any> }) {
  const rows = Object.entries(LABELS)
    .filter(([key]) => key in evidence)
    .map(([key, label]) => ({ key, label, value: Number(evidence[key]) || 0 }));

  return (
    <div className="card p-6">
      <div className="text-xs uppercase tracking-wide text-brand-600 font-semibold mb-4">Evidence Breakdown</div>
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-ink font-medium">{r.label}</span>
              <span className="font-mono text-muted">{(r.value * 100).toFixed(0)}</span>
            </div>
            <div className="h-2 bg-brand-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${r.value * 100}%`, background: barColor(r.value) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
