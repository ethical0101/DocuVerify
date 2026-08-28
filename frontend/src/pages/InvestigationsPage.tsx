import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { listInvestigations, type InvestigationSummary, type RiskLevel } from "../api/client";
import InvestigationCard from "../components/InvestigationCard";

const RISK_FILTERS: (RiskLevel | "ALL")[] = ["ALL", "LOW", "MEDIUM", "HIGH"];

export default function InvestigationsPage() {
  const [items, setItems] = useState<InvestigationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "ALL">("ALL");

  useEffect(() => {
    listInvestigations().then((data) => { setItems(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (riskFilter !== "ALL" && item.risk_level !== riskFilter) return false;
      if (query && !item.filename.toLowerCase().includes(query.toLowerCase()) &&
          !item.case_number.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [items, query, riskFilter]);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Investigations</h1>
      <p className="text-white/50 text-sm mb-6">Every document analyzed on this instance.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by filename or case number..."
            className="w-full glass rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex gap-1.5">
          {RISK_FILTERS.map((r) => (
            <button
              key={r} onClick={() => setRiskFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                riskFilter === r ? "bg-accent text-white" : "glass text-white/50 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-white/40 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-white/40 text-sm">No investigations match.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => <InvestigationCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
