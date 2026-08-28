import { useEffect, useState } from "react";
import { listModels, activateModel, type ModelSummary } from "../../api/enterpriseClient";

export default function ModelRegistryPage() {
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() { listModels().then(setModels).catch(() => {}); }
  useEffect(refresh, []);

  async function onActivate(id: string) {
    setBusy(id);
    try { await activateModel(id); refresh(); } finally { setBusy(null); }
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Model Registry</h1>
      <p className="text-white/50 text-sm mb-6">
        Only one version per model name is active at a time. Activating a new version archives the
        previous one -- it stays in the registry for rollback.
      </p>

      {models.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-white/40 text-sm">No models trained yet.</div>
      ) : (
        <div className="space-y-2">
          {models.map((m) => (
            <div key={m.id} className="glass rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{m.name} {m.version}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    m.status === "active" ? "text-risk-low bg-risk-low/10" : "text-white/40 bg-white/5"
                  }`}>{m.status.toUpperCase()}</span>
                </div>
                <div className="text-xs text-white/40">{m.algorithm}</div>
                <div className="flex gap-3 mt-2 text-sm">
                  {m.metrics.f1 !== undefined && <span className="text-white/70">F1: {(m.metrics.f1 * 100).toFixed(1)}%</span>}
                  {m.metrics.roc_auc != null && <span className="text-white/50">ROC-AUC: {(m.metrics.roc_auc * 100).toFixed(1)}%</span>}
                </div>
              </div>
              {m.status !== "active" && (
                <button onClick={() => onActivate(m.id)} disabled={busy === m.id}
                        className="text-sm bg-accent rounded-lg px-4 py-2 font-medium disabled:opacity-50 shrink-0">
                  {busy === m.id ? "Activating..." : "Activate"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
