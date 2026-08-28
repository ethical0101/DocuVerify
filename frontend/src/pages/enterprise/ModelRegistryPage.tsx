import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layers, CheckCircle2, Cpu } from "lucide-react";
import { listModels, activateModel, type ModelSummary } from "../../api/enterpriseClient";

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

export default function ModelRegistryPage() {
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() { 
    listModels().then(setModels).catch(() => {}); 
  }
  
  useEffect(refresh, []);

  async function onActivate(id: string) {
    setBusy(id);
    try { 
      await activateModel(id); 
      refresh(); 
    } finally { 
      setBusy(null); 
    }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8 relative"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> DEPLOYED ESTIMATORS
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Model Registry</h1>
        <p className="text-white/50 text-sm mt-1">
          Review, activate, or rollback adaptive organization estimators. Only one active version runs per pipeline scan.
        </p>
      </motion.div>

      {models.length === 0 ? (
        <motion.div variants={itemVariants} className="glass rounded-xl p-12 text-center text-white/40 text-sm border border-border/60">
          <Layers className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <div className="font-semibold text-white/80">No model registry records found</div>
          <p className="text-xs text-white/40 mt-1">Deploy a training run on your dataset lab to log a new model.</p>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-4">
          {models.map((m) => {
            const isActive = m.status === "active";
            
            return (
              <div 
                key={m.id} 
                className={`glass glass-elevate rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? "gradient-border shadow-md shadow-accent/5" 
                    : "border-border/60 bg-white/[0.01]"
                }`}
              >
                {/* Active model pulsing status background */}
                {isActive && (
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-accent/40 animate-pulse" />
                )}

                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">
                      {m.name} <span className="text-xs text-white/40 font-mono">v{m.version}</span>
                    </h3>
                    
                    <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      isActive 
                        ? "bg-risk-low/10 text-risk-low border-risk-low/30" 
                        : "bg-white/5 text-white/35 border-border/40"
                    }`}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono">
                    <Cpu className="w-3.5 h-3.5 text-white/20" />
                    <span>ALGORITHM: {m.algorithm.toUpperCase()}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-2 text-xs font-mono">
                    {m.metrics.f1 !== undefined && (
                      <div className="bg-black/25 border border-border/40 rounded px-2 py-0.5 text-white/50">
                        F1: <span className="text-white font-bold font-mono">{(m.metrics.f1 * 100).toFixed(1)}%</span>
                      </div>
                    )}
                    {m.metrics.roc_auc != null && (
                      <div className="bg-black/25 border border-border/40 rounded px-2 py-0.5 text-white/50">
                        ROC-AUC: <span className="text-white font-bold font-mono">{(m.metrics.roc_auc * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {!isActive ? (
                    <button 
                      onClick={() => onActivate(m.id)} 
                      disabled={busy === m.id}
                      className="text-xs font-bold bg-accent hover:bg-accent-bright text-white rounded-lg px-4 py-2 transition-all shadow-md shadow-accent/15 cursor-pointer disabled:opacity-50"
                    >
                      {busy === m.id ? "Deploying..." : "Activate Version"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-risk-low text-xs font-semibold font-mono uppercase bg-risk-low/15 border border-risk-low/20 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Operational Estimator</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
