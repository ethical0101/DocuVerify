import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import {
  listDatasets, startTraining, getTrainingJob, listModels,
  type DatasetSummary, type TrainingJobStatus, type ModelSummary,
} from "../../api/enterpriseClient";

const STAGE_LABELS: Record<string, string> = {
  dataset_preparation: "Preparing dataset",
  feature_extraction: "Extracting forensic features",
  train_validation_split: "Train / validation / test split",
  model_training: "Training estimators",
  cross_validation: "Validating",
  evaluation: "Evaluating",
  model_packaging: "Saving model",
  completed: "Completed",
};

export default function TrainModelPage() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [modelName, setModelName] = useState("Certificate Forensics");
  const [job, setJob] = useState<TrainingJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    listDatasets().then((all) => {
      const ready = all.filter((d) => d.status === "validated");
      setDatasets(ready);
      if (ready.length) setDatasetId(ready[0].id);
    });
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, []);

  async function onStart() {
    setError(null);
    try {
      const { training_job_id } = await startTraining(datasetId, modelName);
      const initial = await getTrainingJob(training_job_id);
      setJob(initial);
      pollRef.current = window.setInterval(async () => {
        const updated = await getTrainingJob(training_job_id);
        setJob(updated);
        if (updated.status === "completed" || updated.status === "failed") {
          if (pollRef.current) window.clearInterval(pollRef.current);
        }
      }, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not start training.");
    }
  }

  const selectedDataset = datasets.find((d) => d.id === datasetId);

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Train Organization Model</h1>
      <p className="text-white/50 text-sm mb-6">
        Trains a lightweight classifier on your organization's own labeled documents, layered on top of
        the base forensic pipeline -- never a replacement for it.
      </p>

      {!job && (
        <div className="glass rounded-xl p-6 space-y-4">
          {datasets.length === 0 ? (
            <div className="text-sm text-white/40">
              No validated datasets available. Upload one on the Datasets page first.
            </div>
          ) : (
            <>
              <label className="block">
                <span className="text-xs text-white/50 mb-1.5 block">Dataset</span>
                <select value={datasetId} onChange={(e) => setDatasetId(e.target.value)}
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none">
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id} className="bg-ink-900">{d.filename}</option>
                  ))}
                </select>
              </label>
              {selectedDataset && (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Genuine" value={selectedDataset.genuine_count} />
                  <Stat label="Forged" value={selectedDataset.forged_count} />
                  <Stat label="Features" value={9} />
                </div>
              )}
              <label className="block">
                <span className="text-xs text-white/50 mb-1.5 block">Model name</span>
                <input value={modelName} onChange={(e) => setModelName(e.target.value)}
                       className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none" />
              </label>
              <div className="text-xs text-white/40">
                Split: 70% train / 15% validation / 15% test. Algorithm chosen automatically (Random Forest,
                falling back to Logistic Regression for very small datasets).
              </div>
              {error && <div className="text-risk-high text-sm">{error}</div>}
              <button onClick={onStart} className="w-full rounded-lg bg-accent py-2.5 font-medium">
                Start Training
              </button>
            </>
          )}
        </div>
      )}

      {job && (
        <div className="glass rounded-xl p-6">
          <div className="space-y-2 mb-4">
            {job.stages.map((s) => (
              <div key={s.name} className="flex items-center gap-3 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  s.status === "completed" ? "bg-risk-low/20 text-risk-low"
                  : s.status === "running" ? "bg-accent/20 text-accent" : "bg-white/5 text-white/20"
                }`}>
                  {s.status === "completed" ? <Check className="w-3 h-3" />
                    : s.status === "running" ? <Loader2 className="w-3 h-3 animate-spin" /> : "○"}
                </span>
                <span className={s.status === "pending" ? "text-white/30" : "text-white/80"}>
                  {STAGE_LABELS[s.name] ?? s.name}
                </span>
              </div>
            ))}
          </div>

          {job.status === "failed" && (
            <div className="text-risk-high text-sm">Training failed: {job.error}</div>
          )}

          {job.status === "completed" && (
            <TrainingResult jobId={job.id} />
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] text-white/40 uppercase">{label}</div>
    </div>
  );
}

function TrainingResult({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<TrainingJobStatus | null>(null);
  const [models, setModels] = useState<ModelSummary[]>([]);

  useEffect(() => {
    getTrainingJob(jobId).then(setJob);
    listModels().then(setModels);
  }, [jobId]);

  if (!job?.model_version_id) return null;
  const model = models.find((m) => m.id === job.model_version_id);
  if (!model) return <div className="text-sm text-white/40 mt-4">Loading results...</div>;

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <div className="text-sm font-medium mb-3">Model Training Complete: {model.name} {model.version}</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricTile label="Accuracy" value={model.metrics.accuracy} />
        <MetricTile label="Precision" value={model.metrics.precision} />
        <MetricTile label="Recall" value={model.metrics.recall} />
        <MetricTile label="F1" value={model.metrics.f1} />
      </div>
      {model.metrics.roc_auc != null && (
        <div className="text-xs text-white/40 mb-4">ROC-AUC: {(model.metrics.roc_auc * 100).toFixed(1)}%</div>
      )}
      <Link to="/enterprise/models" className="text-sm text-accent hover:underline">Review and activate in Model Registry &rarr;</Link>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className="text-lg font-semibold">{value !== undefined ? `${(value * 100).toFixed(1)}%` : "--"}</div>
      <div className="text-[10px] text-white/40 uppercase">{label}</div>
    </div>
  );
}
