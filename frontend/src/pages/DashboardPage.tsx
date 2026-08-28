import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScanSearch, ShieldAlert, ShieldQuestion, ShieldCheck } from "lucide-react";
import { getDashboardStats, type DashboardStats } from "../api/client";
import InvestigationCard from "../components/InvestigationCard";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => setError("Could not load dashboard data."));
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Overview of forensic investigations run on this instance.</p>
        </div>
        <Link to="/investigate" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <ScanSearch className="w-4 h-4" /> New Investigation
        </Link>
      </div>

      {error && <div className="text-risk-high text-sm mb-4">{error}</div>}

      {!stats ? (
        <div className="text-white/40 text-sm">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={ScanSearch} label="Total Investigations" value={stats.total_investigations} color="#4f8cff" />
            <StatCard icon={ShieldAlert} label="High Risk" value={stats.high_risk} color="#f87171" />
            <StatCard icon={ShieldQuestion} label="Medium Risk" value={stats.medium_risk} color="#fbbf24" />
            <StatCard icon={ShieldCheck} label="Low Risk" value={stats.low_risk} color="#34d399" />
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm uppercase tracking-wide text-white/40">Recent Investigations</h2>
            {stats.total_investigations > 0 && (
              <Link to="/investigations" className="text-xs text-accent hover:underline">View all</Link>
            )}
          </div>

          {stats.recent_investigations.length === 0 ? (
            <div className="glass rounded-xl p-10 text-center text-white/40 text-sm">
              No investigations yet. Start your first one above.
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent_investigations.map((item) => (
                <InvestigationCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
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
