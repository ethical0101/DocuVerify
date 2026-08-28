import type { Evidence } from "../api/client";

const LAYERS: { key: string; label: string }[] = [
  { key: "ocr", label: "OCR" },
  { key: "visual_forensics", label: "Visual" },
  { key: "typography", label: "Typography" },
  { key: "structure", label: "Structure" },
  { key: "metadata", label: "Metadata" },
  { key: "consistency", label: "Consistency" },
];

const CONTRIBUTION_COLOR: Record<string, string> = {
  HIGH: "#f87171", MEDIUM: "#fbbf24", LOW: "#34d399", NEUTRAL: "#8b93ab",
};

export default function EvidenceMatrix({ evidenceList, stageSummaries }: {
  evidenceList: Evidence[]; stageSummaries: Record<string, string>;
}) {
  const rows = LAYERS.map((layer) => {
    const items = evidenceList.filter((e) => e.stage === layer.key && !e.informational);
    const maxScore = items.length ? Math.max(...items.map((e) => e.score ?? 0)) : 0;
    const result = items.length === 0
      ? (layer.key === "metadata" && stageSummaries.metadata?.toLowerCase().includes("unavailable")
          ? "Unavailable" : "Consistent")
      : "Suspicious";
    const contribution = items.length === 0 ? "NEUTRAL" : maxScore >= 0.6 ? "HIGH" : maxScore >= 0.35 ? "MEDIUM" : "LOW";
    return { ...layer, result, contribution, count: items.length };
  });

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-4">Evidence Matrix</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 text-xs uppercase tracking-wide">
              <th className="pb-3 font-medium">Forensic Layer</th>
              <th className="pb-3 font-medium">Result</th>
              <th className="pb-3 font-medium text-right">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-white/5">
                <td className="py-3 text-white/80">{row.label}</td>
                <td className="py-3 text-white/60">
                  {row.result}{row.count > 0 && <span className="text-white/30"> ({row.count})</span>}
                </td>
                <td className="py-3 text-right">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ color: CONTRIBUTION_COLOR[row.contribution],
                                 background: `${CONTRIBUTION_COLOR[row.contribution]}1a` }}>
                    {row.contribution}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
