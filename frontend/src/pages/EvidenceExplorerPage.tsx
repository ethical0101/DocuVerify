import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ListChecks, Sparkles, Clock, ChevronLeft } from "lucide-react";
import { getResults, listInvestigations, documentImageUrl, type ResultsResponse, type InvestigationSummary, type Evidence } from "../api/client";
import InvestigationCard from "../components/InvestigationCard";
import DocumentViewer from "../components/DocumentViewer";

const STAGE_FILTERS = ["all", "visual_forensics", "typography", "ocr", "structure", "metadata", "consistency"];
const SEVERITY_FILTERS = ["all", "critical", "high", "medium", "low", "info"];

export default function EvidenceExplorerPage() {
  const { id } = useParams();
  if (!id) return <EvidencePicker />;
  return <EvidenceExplorerForDocument id={id} />;
}

function EvidencePicker() {
  const [items, setItems] = useState<InvestigationSummary[]>([]);
  useEffect(() => { listInvestigations().then(setItems).catch(() => {}); }, []);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5" /> FORENSIC EVIDENCE REGISTRY
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Evidence Explorer</h1>
        <p className="text-white/50 text-sm mt-1">Select an active case investigation to query anomaly signals.</p>
      </div>

      {items.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-white/40 text-sm border border-border/60">
          <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <div className="font-semibold text-white/80">No active cases logged</div>
          <p className="text-xs text-white/40 mt-1">Run document intake to write evidence indices.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => <InvestigationCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

function EvidenceExplorerForDocument({ id }: { id: string }) {
  const navigate = useNavigate();
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [stage, setStage] = useState("all");
  const [severity, setSeverity] = useState("all");

  useEffect(() => { getResults(id).then(setResults).catch(() => {}); }, [id]);

  const filtered = useMemo(() => {
    if (!results) return [];
    return results.evidence_list.filter((e) => {
      if (e.informational) return false;
      if (stage !== "all" && e.stage !== stage) return false;
      if (severity !== "all" && e.severity !== severity) return false;
      return true;
    });
  }, [results, stage, severity]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    (results?.evidence_list ?? []).forEach((e) => { if (!e.informational) c[e.severity] = (c[e.severity] ?? 0) + 1; });
    return c;
  }, [results]);

  if (!results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6 bg-ink-950 cyber-grid">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm font-mono">LOADING EVIDENCE SCHEMATICS...</p>
      </div>
    );
  }

  const severityFiltersColor: Record<string, string> = {
    critical: "text-red-400 border-red-500/30",
    high: "text-red-400 border-red-500/30",
    medium: "text-amber-400 border-amber-500/30",
    low: "text-green-400 border-green-500/30",
    info: "text-blue-400 border-blue-500/30",
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <button 
          onClick={() => navigate(`/report/${id}`)} 
          className="text-xs font-semibold text-white/50 hover:text-white mb-4 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to report
        </button>
        
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5" /> ANOMALY REGISTRY INDEX QUERY
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Evidence Explorer</h1>
        <p className="text-white/50 text-sm mt-1">
          {results.document.filename} &middot; {results.evidence_list.filter(e => !e.informational).length} findings resolved
        </p>
      </div>

      {/* Severity Metrics grids */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(counts).map(([sev, n]) => {
          const colorClass = severityFiltersColor[sev] ?? "text-white/40 border-border/40";
          return (
            <div key={sev} className={`glass rounded-xl p-3 text-center border bg-white/[0.01] ${colorClass}`}>
              <div className="text-xl font-bold font-mono text-white">{n}</div>
              <div className="text-[9px] uppercase tracking-wider font-mono opacity-60 mt-0.5">{sev}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Options */}
      <div className="space-y-3 bg-white/[0.01] border border-border/60 rounded-xl p-5">
        <FilterGroup label="Forensic Layer" options={STAGE_FILTERS} value={stage} onChange={setStage} />
        <div className="h-px bg-border/40 my-2" />
        <FilterGroup label="Severity Tier" options={SEVERITY_FILTERS} value={severity} onChange={setSeverity} />
      </div>

      {/* Side-by-Side Map & Filtered Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-wider">EVIDENCE OVERLAYS TARGET</div>
          <DocumentViewer imageUrl={documentImageUrl(id)} pageSize={results.page_size} evidenceList={filtered} />
        </div>
        
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-wider">FILTERED ANOMALIES LOG</div>
          
          <div className="space-y-2 max-h-[580px] overflow-y-auto scrollbar-thin pr-1">
            {filtered.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center text-white/45 text-sm border border-border/60 bg-white/[0.01]">
                <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <div className="font-semibold text-white/80">No matching logs found</div>
                <p className="text-xs text-white/40 mt-1">Try relaxing filters.</p>
              </div>
            ) : filtered.map((e: Evidence) => {
              const sevColor = severityFiltersColor[e.severity]?.split(" ")[0] ?? "text-white/60";
              return (
                <div key={e.id} className="glass rounded-xl p-4 border border-border/60 bg-white/[0.01] space-y-2.5">
                  <div className="flex items-center justify-between border-b border-border/20 pb-2">
                    <span className="font-bold text-xs text-white/95">{e.title}</span>
                    <span className="text-[10px] font-mono text-white/40 font-bold">{Math.round((e.score ?? 0) * 100)}%</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
                    <span className="uppercase">{e.stage.replaceAll("_", " ")}</span>
                    <span>&middot;</span>
                    <span className={`uppercase font-bold ${sevColor}`}>{e.severity}</span>
                    {e.corroborated && (
                      <>
                        <span>&middot;</span>
                        <span className="text-accent-bright font-bold uppercase tracking-wider text-[9px] flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> corroborated
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed font-sans">{e.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-wider w-24">{label}:</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt} 
            onClick={() => onChange(opt)}
            className={`chip px-3 py-1 rounded-lg text-[10px] font-bold font-mono uppercase border cursor-pointer ${
              value === opt ? "chip-active" : "chip-inactive"
            }`}
          >
            {opt.replaceAll("_", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}
