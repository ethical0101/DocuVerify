import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, Cpu, Database, CheckCircle2, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 lg:p-10 max-w-2xl mx-auto space-y-8 relative"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5" /> MODEL TRAINING LAB
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Train Adaptive Classifier</h1>
        <p className="text-white/50 text-sm mt-1">
          Adapt DocuVerify to your organization's document ecosystem by fitting an adaptive estimator.
        </p>
      </motion.div>

      {!job && (
        <motion.div variants={itemVariants} className="glass gradient-border rounded-xl p-6 border border-border/60 bg-white/[0.01] space-y-5">
          {datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-6 text-white/40 text-xs">
              <Database className="w-8 h-8 text-white/20 mb-2" />
              <div className="font-semibold text-white/80">No validated datasets ready</div>
              <p className="text-[10px] text-white/40 mt-0.5">Please upload and validate a dataset package first.</p>
              <Link to="/enterprise/datasets" className="mt-4 rounded-lg bg-accent px-4 py-2 font-bold text-white text-xs transition-all shadow-md shadow-accent/15">
                Go to datasets
              </Link>
            </div>
          ) : (
            <>
              {/* Dataset Select */}
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/40 block">Select Validated Dataset</span>
                <select 
                  value={datasetId} 
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="w-full bg-black/40 border border-border rounded-lg px-3.5 py-2.5 text-xs text-white/80 outline-none"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id} className="bg-panel">{d.filename}</option>
                  ))}
                </select>
              </label>

              {/* Dataset Metrics */}
              {selectedDataset && (
                <div className="grid grid-cols-3 gap-3 border border-border/60 bg-black/20 rounded-xl p-4">
                  <Stat label="Genuine Samples" value={selectedDataset.genuine_count} />
                  <Stat label="Forged Samples" value={selectedDataset.forged_count} />
                  <Stat label="Features Extracted" value={9} />
                </div>
              )}

              {/* Model Name */}
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/40 block">Classifier Model Name</span>
                <input 
                  value={modelName} 
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Certificate Forensics Model"
                  className="w-full bg-black/40 border border-border rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-accent/60"
                />
              </label>

              {/* Training constraints */}
              <div className="text-[10px] text-white/35 font-mono uppercase leading-normal">
                SPLIT RATIO: 70% TRAIN / 15% VAL / 15% TEST &middot; RANDOM FOREST CLASSIFIER WITH HYPERPARAMETER OPTIMIZATION.
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-risk-high bg-risk-high/15 border border-risk-high/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                onClick={onStart} 
                className="w-full rounded-lg bg-accent hover:bg-accent-bright text-white py-3 font-semibold shadow-lg shadow-accent/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Cpu className="w-4.5 h-4.5" /> Initiate Training Job
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* Active training stepper */}
      {job && (
        <motion.div variants={itemVariants} className="glass gradient-border rounded-xl p-6 border border-border/60 bg-white/[0.01]">
          <div className="space-y-4">
            <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest mb-2 border-b border-border/20 pb-3">
              TRAINING STAGE SCHEDULER
            </div>
            
            <div className="space-y-3.5">
              {job.stages.map((s) => (
                <div key={s.name} className="flex items-center gap-3.5 text-xs">
                  <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 border ${
                    s.status === "completed" 
                      ? "bg-risk-low/10 text-risk-low border-risk-low/30"
                      : s.status === "running" 
                        ? "bg-accent/15 text-accent-bright border-accent/40" 
                        : "bg-white/5 border-border/40 text-white/20"
                  }`}>
                    {s.status === "completed" ? (
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    ) : s.status === "running" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : "○"}
                  </span>
                  <span className={`font-mono tracking-tight ${
                    s.status === "pending" ? "text-white/30" : "text-white/80 font-medium"
                  }`}>
                    {STAGE_LABELS[s.name] ?? s.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {job.status === "failed" && (
            <div className="mt-4 flex items-center gap-2 text-sm text-risk-high bg-risk-high/15 border border-risk-high/30 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Training failed: {job.error}</span>
            </div>
          )}

          {job.status === "completed" && (
            <TrainingResult jobId={job.id} />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center space-y-1">
      <div className="text-base font-bold text-white font-mono">{value}</div>
      <div className="text-[9px] text-white/35 uppercase font-mono tracking-wide">{label}</div>
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
  if (!model) {
    return (
      <div className="mt-6 pt-5 border-t border-border/40 flex items-center gap-2 text-xs text-white/40 font-mono">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>COMPILING EVALUATION METRICS...</span>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-5 border-t border-border/40 space-y-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-risk-low" />
        <span className="text-sm font-bold text-white">
          Model Ready: {model.name} (v{model.version})
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricTile label="Accuracy" value={model.metrics.accuracy} />
        <MetricTile label="Precision" value={model.metrics.precision} />
        <MetricTile label="Recall" value={model.metrics.recall} />
        <MetricTile label="F1 Score" value={model.metrics.f1} />
      </div>

      {model.metrics.roc_auc != null && (
        <div className="flex items-center gap-1.5 bg-white/[0.02] border border-border/60 rounded px-2.5 py-1.5 text-xs text-white/50 font-mono w-fit">
          <TrendingUp className="w-4 h-4 text-accent-bright" />
          <span>ROC-AUC SCORE: {(model.metrics.roc_auc * 100).toFixed(1)}%</span>
        </div>
      )}

      <Link 
        to="/enterprise/models" 
        className="rounded-lg bg-accent hover:bg-accent-bright text-white py-2.5 text-xs font-bold transition-all shadow-md shadow-accent/15 flex items-center justify-center gap-1.5 cursor-pointer max-w-xs"
      >
        <span>Review & Activate Model</span> <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="glass glass-elevate border border-border/60 rounded-xl p-3.5 text-center space-y-1">
      <div className="text-base font-extrabold text-white font-mono">
        {value !== undefined ? `${(value * 100).toFixed(1)}%` : "--"}
      </div>
      <div className="text-[9px] text-white/35 uppercase font-mono tracking-wider">{label}</div>
    </div>
  );
}
