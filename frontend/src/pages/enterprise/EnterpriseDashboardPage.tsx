import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, ShieldAlert, ShieldQuestion, ShieldCheck, ScanSearch, Database, Terminal, ArrowUpRight, Clock, PlusCircle } from "lucide-react";
import { getEnterpriseDashboard, type EnterpriseDashboard } from "../../api/enterpriseClient";

export default function EnterpriseDashboardPage() {
  const [dash, setDash] = useState<EnterpriseDashboard | null>(null);

  useEffect(() => { 
    getEnterpriseDashboard().then(setDash).catch(() => {}); 
  }, []);

  if (!dash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6 bg-ink-950 cyber-grid">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm font-mono">LOADING CONTROL TERMINAL...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-accent" /> ENTERPRISE ADMINISTRATIVE HUB
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            {dash.organization.name}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Configure adaptive detection networks and coordinate dataset iterations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            to="/enterprise/training" 
            className="rounded-lg bg-accent hover:bg-accent-bright px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-accent/15 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Train Estimator
          </Link>
        </div>
      </div>

      {/* Hero row: Model Info + Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Active Model Status */}
        <div className="glass rounded-xl p-6 border border-border/60 bg-gradient-to-r from-accent/5 to-transparent relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/5 filter blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[9px] font-bold text-accent-bright font-mono uppercase tracking-widest">
                ACTIVE ORGANIZATIONAL ESTIMATOR
              </div>
              {dash.active_model ? (
                <h3 className="text-xl font-bold text-white mt-1">
                  {dash.active_model.name} <span className="text-xs text-white/40 font-mono">v{dash.active_model.version}</span>
                </h3>
              ) : (
                <h3 className="text-lg font-bold text-white/50 mt-1">No custom estimator activated</h3>
              )}
            </div>
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Cpu className="w-4.5 h-4.5 text-accent-bright" />
            </div>
          </div>

          {dash.active_model ? (
            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-border/40 pt-4">
              {dash.active_model.metrics.f1 !== undefined && (
                <div className="space-y-0.5">
                  <div className="text-[9px] text-white/40 font-mono">F1 MATCH SCORE</div>
                  <div className="text-lg font-extrabold text-white font-mono">{(dash.active_model.metrics.f1 * 100).toFixed(1)}%</div>
                </div>
              )}
              {dash.active_model.metrics.accuracy !== undefined && (
                <div className="space-y-0.5">
                  <div className="text-[9px] text-white/40 font-mono">ESTIMATION ACCURACY</div>
                  <div className="text-lg font-extrabold text-white font-mono">{(dash.active_model.metrics.accuracy * 100).toFixed(1)}%</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-white/40 leading-relaxed mt-4">
              All scans are defaulting to the base forensic pipeline.{" "}
              <Link to="/enterprise/training" className="text-accent-bright hover:underline font-semibold">
                Train organization model
              </Link>
            </div>
          )}
        </div>

        {/* Shortcuts Panel */}
        <div className="glass rounded-xl p-5 border border-border/60 grid grid-cols-1 gap-2.5 bg-white/[0.01]">
          <ShortcutButton to="/enterprise/datasets" icon={Database} label="Model Dataset Lab" desc="Upload genuine / forged samples" />
          <ShortcutButton to="/enterprise/training" icon={Cpu} label="Model Training Console" desc="Deploy Random Forest training" />
          <ShortcutButton to="/investigate" icon={ScanSearch} label="Initiate Case Investigation" desc="Run manual/quick document scans" />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Ingested Scans" value={dash.total_investigations} color="#3b82f6" icon={ScanSearch} />
        <StatTile label="High Risk Warnings" value={dash.high_risk} color="#ef4444" icon={ShieldAlert} />
        <StatTile label="Medium Risk Flagged" value={dash.medium_risk} color="#f59e0b" icon={ShieldQuestion} />
        <StatTile label="Verified Secure" value={dash.low_risk} color="#10b981" icon={ShieldCheck} />
      </div>

      {/* Recent Training Iterations */}
      <div className="space-y-3">
        <div className="text-xs uppercase font-bold tracking-widest text-white/35 font-mono">
          ESTIMATOR DEPLOYMENT LOGS
        </div>
        {dash.recent_training.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-white/40 text-sm border border-border/60">
            <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <div className="font-semibold text-white/80">No training logs recorded</div>
            <p className="text-xs text-white/40 mt-1">Iterate training epochs on organization data labs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dash.recent_training.map((job) => (
              <div key={job.id} className="glass rounded-xl p-4 border border-border/60 flex items-center justify-between text-xs font-mono bg-white/[0.01]">
                <div className="space-y-1">
                  <div className="text-white/40 text-[9px]">ITERATION RUN ID</div>
                  <div className="text-white/80 font-bold truncate max-w-[190px]">{job.id}</div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  job.status === "completed" 
                    ? "bg-risk-low/10 text-risk-low border-risk-low/30"
                    : job.status === "failed" 
                      ? "bg-risk-high/10 text-risk-high border-risk-high/30" 
                      : "bg-accent/15 text-accent-bright border-accent/25"
                }`}>{job.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShortcutButton({ to, icon: Icon, label, desc }: { to: string; icon: any; label: string; desc: string }) {
  return (
    <Link 
      to={to} 
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/40 bg-black/20 hover:bg-white/[0.02] transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-white/45 group-hover:text-accent-bright group-hover:bg-accent/10 transition-colors">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">{label}</div>
          <div className="text-[10px] text-white/40 mt-0.5 truncate">{desc}</div>
        </div>
      </div>
      <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-accent-bright group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
    </Link>
  );
}

function StatTile({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <div className="glass glass-elevate rounded-xl p-5 border border-white/[0.08] relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
      {/* Background radial soft light orb */}
      <div 
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none transition-opacity group-hover:opacity-25" 
        style={{ backgroundColor: color }}
      />
      {/* Vertical indicator status bar on the left */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
      
      <div className="flex items-center justify-between pl-1">
        <span className="text-[10px] font-bold text-white/65 uppercase tracking-widest font-mono">{label}</span>
        <Icon className="w-4 h-4 text-white/50 group-hover:scale-105 transition-transform" style={{ color }} />
      </div>
      
      <div 
        className="text-3.5xl font-black mt-3 font-mono tracking-tight pl-1"
        style={{ 
          color: color,
          textShadow: `0 0 15px ${color}50`
        }}
      >
        {value}
      </div>
    </div>
  );
}
