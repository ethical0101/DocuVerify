import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Check, X as XIcon } from "lucide-react";
import { uploadDataset, listDatasets, type DatasetSummary } from "../../api/enterpriseClient";

export default function DatasetsPage() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState<DatasetSummary | null>(null);

  function refresh() {
    listDatasets().then(setDatasets).catch(() => {});
  }
  useEffect(refresh, []);

  async function onFile(file: File) {
    setUploading(true);
    setError(null);
    setJustUploaded(null);
    try {
      const ds = await uploadDataset(file);
      setJustUploaded(ds);
      refresh();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Dataset Management</h1>
      <p className="text-white/50 text-sm mb-6">
        Upload a ZIP with <code>genuine/</code> and <code>forged/</code> folders (optionally a
        <code> metadata.csv</code>) to train an organization-specific model.
      </p>

      <label className="glass rounded-xl border-2 border-dashed border-white/15 hover:border-white/30 p-8 flex flex-col items-center gap-2 cursor-pointer mb-6">
        <Upload className="w-6 h-6 text-accent" />
        <span className="text-sm text-white/70">{uploading ? "Uploading & validating..." : "Click to upload a dataset .zip"}</span>
        <input type="file" accept=".zip" className="hidden" disabled={uploading}
               onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </label>

      {error && <div className="text-risk-high text-sm mb-4">{error}</div>}

      {justUploaded && (
        <div className="glass rounded-xl p-5 mb-6">
          <div className="text-xs uppercase tracking-wide text-white/40 mb-3">Validation Result</div>
          <div className="space-y-1.5">
            {justUploaded.validation_report.checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                {c.passed ? <Check className="w-4 h-4 text-risk-low" /> : <XIcon className="w-4 h-4 text-risk-high" />}
                <span className={c.passed ? "text-white/70" : "text-risk-high"}>{c.label}</span>
              </div>
            ))}
          </div>
          <div className={`mt-3 text-sm font-medium ${justUploaded.status === "validated" ? "text-risk-low" : "text-risk-high"}`}>
            {justUploaded.status === "validated" ? "Dataset ready for training." : "Dataset not ready -- fix the issues above."}
          </div>
          {justUploaded.status === "validated" && (
            <button onClick={() => navigate("/enterprise/training")} className="mt-3 text-sm bg-accent rounded-lg px-4 py-2 font-medium">
              Continue to training
            </button>
          )}
        </div>
      )}

      <div className="text-sm uppercase tracking-wide text-white/40 mb-3">Uploaded Datasets</div>
      {datasets.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-white/40 text-sm">No datasets uploaded yet.</div>
      ) : (
        <div className="space-y-2">
          {datasets.map((d) => (
            <div key={d.id} className="glass rounded-lg p-4 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{d.filename}</div>
                <div className="text-xs text-white/40">{d.genuine_count} genuine / {d.forged_count} forged</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                d.status === "validated" ? "text-risk-low bg-risk-low/10" : "text-risk-high bg-risk-high/10"
              }`}>{d.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
