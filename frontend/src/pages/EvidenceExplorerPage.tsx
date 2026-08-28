import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Evidence Explorer</h1>
      <p className="text-white/50 text-sm mb-6">Select an investigation to browse its findings.</p>
      {items.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-white/40 text-sm">
          No investigations yet -- analyze a document first.
        </div>
      ) : (
        <div className="space-y-2">{items.map((item) => <InvestigationCard key={item.id} item={item} />)}</div>
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

  if (!results) return <div className="p-10 text-white/40 text-sm">Loading...</div>;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <button onClick={() => navigate(`/report/${id}`)} className="text-sm text-white/50 hover:text-white mb-4">
        &larr; Back to report
      </button>
      <h1 className="text-2xl font-semibold mb-1">Evidence Explorer</h1>
      <p className="text-white/50 text-sm mb-6">{results.document.filename} &middot; {results.evidence_list.filter(e => !e.informational).length} findings</p>

      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(counts).map(([sev, n]) => (
          <div key={sev} className="glass rounded-lg px-4 py-2 text-center">
            <div className="text-lg font-semibold">{n}</div>
            <div className="text-[10px] uppercase text-white/40">{sev}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterGroup label="Stage" options={STAGE_FILTERS} value={stage} onChange={setStage} />
        <FilterGroup label="Severity" options={SEVERITY_FILTERS} value={severity} onChange={setSeverity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DocumentViewer imageUrl={documentImageUrl(id)} pageSize={results.page_size} evidenceList={filtered} />
        <div className="space-y-2 max-h-[640px] overflow-y-auto scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-white/40 text-sm">No findings match these filters.</div>
          ) : filtered.map((e: Evidence) => (
            <div key={e.id} className="glass rounded-lg p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-sm">{e.title}</span>
                <span className="text-xs font-mono text-white/40">{Math.round((e.score ?? 0) * 100)}%</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/40 mb-2">
                <span className="uppercase">{e.stage.replaceAll("_", " ")}</span>
                <span>&middot;</span>
                <span className="uppercase">{e.severity}</span>
                {e.corroborated && <><span>&middot;</span><span className="text-accent">corroborated</span></>}
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{e.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-white/30 mr-1">{label}:</span>
      {options.map((opt) => (
        <button
          key={opt} onClick={() => onChange(opt)}
          className={`px-2.5 py-1 rounded-full text-xs transition capitalize ${
            value === opt ? "bg-accent text-white" : "glass text-white/50 hover:text-white"
          }`}
        >
          {opt.replaceAll("_", " ")}
        </button>
      ))}
    </div>
  );
}
