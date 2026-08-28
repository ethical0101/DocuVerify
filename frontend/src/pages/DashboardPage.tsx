import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ScanSearch, ShieldAlert, ShieldQuestion, ShieldCheck, Cpu, 
  ChevronRight, AlertTriangle 
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, 
  XAxis, YAxis, Tooltip 
} from "recharts";
import { getDashboardStats, type DashboardStats } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import InvestigationCard from "../components/InvestigationCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError("Could not load dashboard data."));
  }, []);

  const riskData = stats
    ? [
        { name: "High Risk", value: stats.high_risk, color: "#ef4444" },
        { name: "Medium Risk", value: stats.medium_risk, color: "#f59e0b" },
        { name: "Low Risk", value: stats.low_risk, color: "#10b981" },
      ].filter((d) => d.value > 0)
    : [];

  const activityData = stats ? (() => {
    const datesMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      datesMap[label] = 0;
    }
    stats.recent_investigations.forEach(inv => {
      try {
        const label = new Date(inv.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        if (label in datesMap) datesMap[label] += 1;
      } catch (e) {}
    });
    return Object.entries(datesMap).map(([date, count]) => ({ date, count }));
  })() : [];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 relative"
    >
      <motion.div 
        variants={itemVariants} 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5"
      >
        <div>
          <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <ScanSearch className="w-3.5 h-3.5" /> DIGITAL SCAN OPS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Command Center</h1>
          <p className="text-white/50 text-sm mt-1">Real-time overview of document scans, active neural layers, and anomalies.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/investigate" 
            className="rounded-lg bg-accent hover:bg-accent-bright px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/15 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ScanSearch className="w-4 h-4" /> + New Investigation
          </Link>
        </div>
      </motion.div>

      {error && (
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-2 text-sm text-risk-high bg-risk-high/10 border border-risk-high/20 rounded-lg px-4 py-3"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </motion.div>
      )}

      {!stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass rounded-xl p-6 h-28 animate-pulse bg-white/[0.01]" />
          ))}
        </div>
      ) : (
        <>
          <motion.div 
            variants={itemVariants}
            className="glass gradient-border rounded-xl p-5 border border-border/60 bg-gradient-to-r from-accent/5 via-transparent to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5 text-accent-bright" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider font-mono">ACTIVE DECLASSIFIER LAYER</div>
                {stats.active_model ? (
                  <div className="text-sm font-medium text-white/95 mt-0.5">
                    {stats.active_model.name} <span className="text-accent-bright font-mono text-xs ml-1">v{stats.active_model.version}</span>
                  </div>
                ) : (
                  <div className="text-sm text-white/65 mt-0.5">Base multi-signal forensic suite.</div>
                )}
              </div>
            </div>
            
            {stats.active_model ? (
              <div className="flex items-center gap-4 text-xs font-mono">
                {stats.active_model.metrics && Object.entries(stats.active_model.metrics).slice(0, 3).map(([k, v]) => (
                  <div key={k} className="bg-white/[0.02] border border-border/40 rounded px-2.5 py-1">
                    <span className="text-white/70 uppercase">{k}:</span>{" "}
                    <span className="font-semibold text-accent-bright">{(v * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : user?.role === "admin" && (
              <Link to="/enterprise/training" className="text-xs text-accent hover:text-accent-bright hover:underline font-medium flex items-center gap-1">
                Train adaptive model <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Total Investigations" value={stats.total_investigations} color="#3b82f6" icon={ScanSearch} />
            <StatTile label="Confirmed High Risk" value={stats.high_risk} color="#ef4444" icon={ShieldAlert} />
            <StatTile label="Medium Risk Warnings" value={stats.medium_risk} color="#f59e0b" icon={ShieldQuestion} />
            <StatTile label="Verified Authenticity" value={stats.low_risk} color="#10b981" icon={ShieldCheck} />
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-6">
            <div className="glass rounded-xl p-5 flex flex-col border border-border/60">
              <div>
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest font-mono">RISK PROPORTION</h3>
                <div className="text-lg font-bold text-white mt-0.5">Alert Distribution</div>
              </div>
              <div className="h-56 flex items-center justify-center relative mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} innerRadius={65} outerRadius={85} paddingAngle={3} dataKey="value">
                      {riskData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} stroke="var(--bg-panel)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", borderRadius: "8px" }} itemStyle={{ fontSize: "12px", color: "var(--text-primary)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <div className="text-2xl font-bold text-white font-mono">{stats.total_investigations}</div>
                  <div className="text-[10px] text-white/65 uppercase font-mono tracking-wider">Total</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-4 mt-auto">
                <LegendItem label="High" value={stats.high_risk} color="bg-risk-high" />
                <LegendItem label="Medium" value={stats.medium_risk} color="bg-risk-medium" />
                <LegendItem label="Low" value={stats.low_risk} color="bg-risk-low" />
              </div>
            </div>

            <div className="glass rounded-xl p-5 flex flex-col border border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest font-mono">ACTIVITY</h3>
                  <div className="text-lg font-bold text-white mt-0.5">Ingestion Scan History</div>
                </div>
              </div>
              <div className="h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="var(--border-color)" style={{ fontSize: "10px" }} />
                    <YAxis allowDecimals={false} stroke="var(--border-color)" style={{ fontSize: "10px" }} />
                    <Tooltip contentStyle={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", borderRadius: "8px" }} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase font-bold tracking-widest text-white/60 font-mono">
                RECENT FORENSIC ACTIVITY
              </div>
              {stats.total_investigations > 0 && (
                <Link to="/investigations" className="text-xs text-accent-bright hover:underline flex items-center gap-1 font-semibold">
                  Browse Case Files &rarr;
                </Link>
              )}
            </div>
            {stats.recent_investigations.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-white/40 text-sm border border-border/60">
                No active scan cases compiled.
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recent_investigations.map((item) => (
                  <InvestigationCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
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

function LegendItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/[0.01] border border-border/40 rounded px-2.5 py-1.5 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-1.5 text-white/75">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span>{label}</span>
      </div>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}
