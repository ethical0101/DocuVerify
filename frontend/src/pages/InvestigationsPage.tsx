import { useEffect, useMemo, useState } from "react";
import { Search, FolderSearch, Clock } from "lucide-react";
import { listInvestigations, type InvestigationSummary, type RiskLevel } from "../api/client";
import InvestigationCard from "../components/InvestigationCard";

const RISK_FILTERS: (RiskLevel | "ALL")[] = ["ALL", "LOW", "MEDIUM", "HIGH"];

export default function InvestigationsPage() {
  const [items, setItems] = useState<InvestigationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "ALL">("ALL");

  useEffect(() => {
    listInvestigations()
      .then((data) => { 
        setItems(data); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
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
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <FolderSearch className="w-3.5 h-3.5" /> INVESTIGATIONS LOG
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Case Files</h1>
        <p className="text-white/50 text-sm mt-1">Browse and search historical case file assessments log.</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by case code or filename..."
            className="w-full bg-black/45 border border-border rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-accent/60 transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {RISK_FILTERS.map((r) => (
            <button
              key={r} 
              onClick={() => setRiskFilter(r)}
              className={`chip px-3 py-2 rounded-lg text-xs font-bold font-mono border cursor-pointer ${
                riskFilter === r ? "chip-active" : "chip-inactive"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Case List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-xl p-6 h-18 animate-pulse bg-white/[0.01]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-white/45 text-sm border border-border/60">
          <Clock className="w-8 h-8 text-white/25 mx-auto mb-2" />
          <div className="font-semibold text-white/80">No matches found</div>
          <p className="text-xs text-white/40 mt-1">Try relaxing filters or search terms.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <InvestigationCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
