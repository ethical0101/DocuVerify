import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, ShieldAlert, ShieldQuestion, ShieldCheck, ScanSearch, Database } from "lucide-react";
import { getEnterpriseDashboard, type EnterpriseDashboard } from "../../api/enterpriseClient";

export default function EnterpriseDashboardPage() {
  const [dash, setDash] = useState<EnterpriseDashboard | null>(null);

  useEffect(() => { getEnterpriseDashboard().then(setDash).catch(() => {}); }, []);

  if (!dash) return <div className="p-10 text-white/40 text-sm">Loading...</div>;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="text-xs uppercase tracking-widest text-white/30 mb-1">Enterprise AI Control Center</div>
      <h1 className="text-2xl font-semibold mb-8">{dash.organization.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-xl p-5">
          <div className="text-xs uppercase tracking-wide text-white/40 mb-2">Active Model</div>
          {dash.active_model ? (
            <>
              <div className="text-lg font-medium">{dash.active_model.name} {dash.active_model.version}</div>
              <div className="flex gap-4 mt-2 text-sm text-white/60">
                {dash.active_model.metrics.f1 !== undefined && (
                  <span>F1: <span className="text-white font-mono">{(dash.active_model.metrics.f1 * 100).toFixed(1)}%</span></span>
                )}
                {dash.active_model.metrics.accuracy !== undefined && (
                  <span>Accuracy: <span className="text-white font-mono">{(dash.active_model.metrics.accuracy * 100).toFixed(1)}%</span></span>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-white/40">
              No model activated yet. <Link to="/enterprise/training" className="text-accent hover:underline">Train one</Link>.
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-5 flex flex-col justify-center gap-2">
          <Link to="/enterprise/datasets" className="text-sm flex items-center gap-2 text-white/70 hover:text-white">
            <Database className="w-4 h-4" /> Manage datasets
          </Link>
          <Link to="/enterprise/training" className="text-sm flex items-center gap-2 text-white/70 hover:text-white">
            <Cpu className="w-4 h-4" /> Train a new model
          </Link>
          <Link to="/investigate" className="text-sm flex items-center gap-2 text-white/70 hover:text-white">
            <ScanSearch className="w-4 h-4" /> Run an investigation
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ScanSearch} label="Investigations" value={dash.total_investigations} color="#4f8cff" />
        <StatCard icon={ShieldAlert} label="High Risk" value={dash.high_risk} color="#f87171" />
        <StatCard icon={ShieldQuestion} label="Medium Risk" value={dash.medium_risk} color="#fbbf24" />
        <StatCard icon={ShieldCheck} label="Low Risk" value={dash.low_risk} color="#34d399" />
      </div>

      <div className="text-sm uppercase tracking-wide text-white/40 mb-3">Recent Training</div>
      {dash.recent_training.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-white/40 text-sm">
          No training jobs yet. <Link to="/enterprise/training" className="text-accent hover:underline">Start your first one</Link>.
        </div>
      ) : (
        <div className="space-y-2">
          {dash.recent_training.map((job) => (
            <div key={job.id} className="glass rounded-lg p-4 flex items-center justify-between text-sm">
              <span className="font-mono text-white/60">{job.id}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                job.status === "completed" ? "text-risk-low bg-risk-low/10"
                : job.status === "failed" ? "text-risk-high bg-risk-high/10" : "text-accent bg-accent/10"
              }`}>{job.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <Icon className="w-4 h-4 mb-3" style={{ color }} />
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-white/40 mt-0.5">{label}</div>
    </div>
  );
}
