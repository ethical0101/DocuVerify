import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Check, X as XIcon, Database, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { uploadDataset, listDatasets, type DatasetSummary } from "../../api/enterpriseClient";

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8 relative"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" /> MODEL DATA LAB
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Organization Datasets</h1>
        <p className="text-white/50 text-sm mt-1">
          Upload and validate labeled document archives to initialize training weights.
        </p>
      </motion.div>

      {/* Upload Zone */}
      <motion.label 
        variants={itemVariants}
        className="glass gradient-border rounded-xl border-2 border-dashed border-border/80 hover:border-accent/40 bg-white/[0.01] hover:bg-white/[0.02] p-10 flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 relative overflow-hidden group"
      >
        <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-accent-bright group-hover:scale-105 transition-transform">
          <Upload className="w-5.5 h-5.5" />
        </div>
        <div className="text-center">
          <span className="text-sm font-semibold text-white/95">
            {uploading ? "Ingesting & validating dataset package..." : "Upload Labeled Dataset Zip"}
          </span>
          <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto">
            Package must contain <code className="text-accent-bright">genuine/</code> and <code className="text-accent-bright">forged/</code> directories.
          </p>
        </div>
        <input 
          type="file" 
          accept=".zip" 
          className="hidden" 
          disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} 
        />
      </motion.label>

      {error && (
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-2 text-sm text-risk-high bg-risk-high/15 border border-risk-high/30 rounded-lg px-4 py-3"
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Validation Checklist results */}
      {justUploaded && (
        <motion.div 
          variants={itemVariants}
          className="glass gradient-border rounded-xl p-6 border border-border/60 bg-white/[0.01] space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent-bright" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">INGESTION VALIDATION MATRIX</div>
              <h3 className="text-sm font-bold text-white mt-0.5">Checklist Results</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border/40 pt-4">
            {justUploaded.validation_report.checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2.5 text-xs bg-black/20 border border-border/40 rounded-lg p-2.5 font-mono">
                {c.passed ? (
                  <Check className="w-4 h-4 text-risk-low shrink-0" />
                ) : (
                  <XIcon className="w-4 h-4 text-risk-high shrink-0" />
                )}
                <span className={c.passed ? "text-white/70" : "text-risk-high"}>{c.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/40 pt-4 mt-2">
            <div className={`text-xs font-bold font-mono tracking-wide ${
              justUploaded.status === "validated" ? "text-risk-low" : "text-risk-high"
            }`}>
              STATUS: {justUploaded.status === "validated" ? "VALIDATION PASSED" : "VALIDATION FAILED"}
            </div>
            {justUploaded.status === "validated" && (
              <button 
                onClick={() => navigate("/enterprise/training")} 
                className="rounded-lg bg-accent hover:bg-accent-bright px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-accent/15 flex items-center gap-1.5 cursor-pointer"
              >
                Start Estimator Training <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Dataset Grid List */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="text-xs uppercase font-bold tracking-widest text-white/35 font-mono">
          REGISTERED DATASETS
        </div>
        
        {datasets.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center text-white/40 text-sm border border-border/60">
            <Database className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <div className="font-semibold text-white/80">No dataset packages registered</div>
            <p className="text-xs text-white/40 mt-1">Upload a zip file above to train model weights.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {datasets.map((d) => {
              const total = d.genuine_count + d.forged_count;
              const genuinePercent = total > 0 ? (d.genuine_count / total) * 100 : 0;
              const forgedPercent = total > 0 ? (d.forged_count / total) * 100 : 0;

              return (
                <div key={d.id} className="glass glass-elevate rounded-xl p-5 border border-border/60 flex flex-col justify-between space-y-4 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-white font-mono tracking-tight break-all pr-4">{d.filename}</div>
                      <div className="text-[10px] text-white/30 font-mono mt-0.5 uppercase tracking-wide">ID: {d.id.slice(0, 8)}...</div>
                    </div>
                    <span className="text-[9px] font-bold font-mono tracking-wider px-2 py-0.5 rounded border border-risk-low/30 text-risk-low bg-risk-low/10">
                      VALIDATED
                    </span>
                  </div>

                  {/* genuine / forged distribution */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase">
                      <span>Genuine: {d.genuine_count}</span>
                      <span>Forged: {d.forged_count}</span>
                    </div>
                    {/* Visual Stacked Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden flex">
                      <div className="h-full bg-accent-bright" style={{ width: `${genuinePercent}%` }} />
                      <div className="h-full bg-risk-high" style={{ width: `${forgedPercent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
