import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileCheck2, ShieldAlert, CheckCircle2 } from "lucide-react";
import {
  analyzeDocument, getResults, documentImageUrl, STAGE_ORDER,
  type ResultsResponse, type StageKey, type Evidence
} from "../api/client";
import ForensicTimeline from "../components/ForensicTimeline";
import DocumentViewer from "../components/DocumentViewer";
import ScoreCard from "../components/ScoreCard";

export default function ForensicWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!id || started.current) return;
    started.current = true;
    analyzeDocument(id)
      .then(() => getResults(id))
      .then(setResults)
      .catch((e) => setError(e?.response?.data?.detail ?? "Analysis failed. Please try again."));
  }, [id]);

  useEffect(() => {
    // Reset selected index when stage changes
    setSelectedIndex(null);
  }, [stageIdx]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-ink-950 cyber-grid">
        <div className="w-full max-w-md glass rounded-2xl p-8 border border-risk-high/30 bg-gradient-to-b from-risk-high/5 to-transparent text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-risk-high/15 border border-risk-high/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-risk-high" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Analysis Failed</h2>
            <p className="text-sm text-white/50">Pipeline execution encountered a fatal parsing error.</p>
          </div>
          <div className="bg-black/30 border border-border p-3 rounded-lg font-mono text-xs text-white/60 break-all">
            {error}
          </div>
          <button onClick={() => navigate("/investigate")} className="w-full rounded-lg bg-accent py-2.5 font-medium text-white transition-colors cursor-pointer">
            Retry Intake
          </button>
        </div>
      </div>
    );
  }

  if (!results || !id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6 bg-ink-950 cyber-grid">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm font-mono">EXECUTING BACKEND FORENSIC PIPELINE...</p>
      </div>
    );
  }

  const stage: StageKey = STAGE_ORDER[stageIdx];
  const summary = results.stage_summaries[stage];

  // Helper to map OCR words to bounding box coordinates on demand
  const ocrEvidenceList: Evidence[] = results.ocr_words.map((w, idx) => ({
    id: `ocr-${idx}`,
    stage: "ocr",
    type: "text",
    bbox: w.bbox,
    severity: "info",
    confidence: w.confidence,
    score: w.confidence,
    title: `Text block: ${w.text}`,
    summary: `Extracted characters: "${w.text}" with EasyOCR confidence of ${Math.round(w.confidence * 100)}%`,
    why_it_matters: "Verifying standard font alignment, layout geometry, and syntax consistency.",
    recommended_check: "Cross-reference text values against standard verification sources.",
    corroborated: false,
    informational: true,
  }));

  // Resolve what bounding box list is rendered in DocumentViewer for this stage
  let stageEvidenceForMap: Evidence[] = [];
  if (stage === "ocr") {
    stageEvidenceForMap = ocrEvidenceList;
  } else if (stage === "intake") {
    stageEvidenceForMap = [];
  } else if (stage === "fusion") {
    // Show all anomalies fused together
    stageEvidenceForMap = results.evidence_list;
  } else {
    // Filter anomalies by active stage
    stageEvidenceForMap = results.evidence_list.filter((e) => e.stage === stage);
  }

  const isLast = stageIdx === STAGE_ORDER.length - 1;

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Workbench Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="text-[10px] text-accent-bright font-mono tracking-widest uppercase mb-1">
            CASE FILE: {results.document.case_number} &middot; CATEGORY: {results.document.category.toUpperCase()}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{results.document.filename}</h1>
        </div>
        <button 
          onClick={() => navigate(`/report/${id}`)} 
          className="text-xs font-semibold bg-white/[0.02] border border-border/80 hover:bg-white/[0.05] rounded-lg px-3.5 py-2 text-white/70 hover:text-white transition-all cursor-pointer shrink-0"
        >
          Skip to Full Report
        </button>
      </div>

      {/* 3-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_1.1fr_1fr] gap-6 items-start">
        
        {/* Column 1: Vertical Timeline */}
        <div className="lg:sticky lg:top-4">
          <ForensicTimeline currentIndex={stageIdx} onSelect={setStageIdx} />
        </div>

        {/* Column 2: Document Viewer Map */}
        <div className="min-w-0">
          <DocumentViewer
            imageUrl={documentImageUrl(id)}
            pageSize={results.page_size}
            evidenceList={stageEvidenceForMap}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />
        </div>

        {/* Column 3: Findings Panel */}
        <div className="space-y-4">
          {/* Stage summary details card */}
          <div className="glass rounded-xl p-5 border border-border/60 bg-gradient-to-r from-accent/5 via-transparent to-transparent">
            <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-wider mb-1">
              STAGE SUMMARY
            </div>
            <div className="text-sm font-semibold text-white/95 leading-relaxed">{summary}</div>
          </div>

          {/* Dynamic Stage Details Panel */}
          <div className="glass rounded-xl p-5 border border-border/60 space-y-4 min-h-[220px]">
            <StageFindingsPanel
              stage={stage}
              results={results}
              stageEvidence={stageEvidenceForMap.filter(e => !e.informational)}
              ocrEvidenceList={ocrEvidenceList}
              selectedIndex={selectedIndex}
              onSelectIndex={setSelectedIndex}
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setStageIdx((s) => Math.max(0, s - 1))}
              disabled={stageIdx === 0}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold border border-border bg-white/[0.01] hover:bg-white/[0.03] disabled:opacity-30 rounded-lg py-2.5 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              Previous Stage
            </button>
            
            {isLast ? (
              <button
                onClick={() => navigate(`/report/${id}`)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-accent hover:bg-accent-bright rounded-lg py-2.5 text-white transition-all shadow-md shadow-accent/15 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" /> View Case Report
              </button>
            ) : (
              <button
                onClick={() => setStageIdx((s) => Math.min(STAGE_ORDER.length - 1, s + 1))}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-accent hover:bg-accent-bright rounded-lg py-2.5 text-white transition-all shadow-md shadow-accent/15 cursor-pointer"
              >
                Next Step &rarr;
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

interface StageFindingsPanelProps {
  stage: StageKey;
  results: ResultsResponse;
  stageEvidence: Evidence[];
  ocrEvidenceList: Evidence[];
  selectedIndex: number | null;
  onSelectIndex: (i: number | null) => void;
}

function StageFindingsPanel({
  stage, results, stageEvidence, ocrEvidenceList, selectedIndex, onSelectIndex
}: StageFindingsPanelProps) {
  
  if (stage === "intake") {
    return (
      <div className="space-y-4 text-xs font-mono">
        <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-1.5">INGESTION DATA STAMP</div>
        <div className="space-y-2 border-t border-border/40 pt-3">
          <DetailRow label="Filename" value={results.document.filename} />
          <DetailRow label="Case ID" value={results.document.case_number} />
          <DetailRow label="Category" value={results.document.category} />
          <DetailRow label="Image Size" value={`${results.page_size[0]} x ${results.page_size[1]}`} />
        </div>
      </div>
    );
  }

  if (stage === "ocr") {
    return (
      <div className="space-y-3">
        <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest font-mono">EXTRACTED WORD BLOCKS</div>
        {results.ocr_words.length === 0 ? (
          <div className="text-xs text-white/40 font-mono py-4">No text regions resolved on this file.</div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {ocrEvidenceList.map((w, idx) => {
              const active = selectedIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectIndex(idx)}
                  className={`w-full text-left flex items-center justify-between rounded-lg p-2.5 border text-xs font-mono transition-all cursor-pointer ${
                    active 
                      ? "bg-accent/15 border-accent/40 text-white shadow-sm" 
                      : "bg-white/[0.01] border-border hover:border-white/10 hover:bg-white/[0.02] text-white/60"
                  }`}
                >
                  <span className="truncate font-semibold max-w-[170px]">{w.title?.replace("Text block: ", "")}</span>
                  <span className="text-[10px] text-white/40">{Math.round((w.confidence ?? 0) * 100)}%</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (stage === "visual_forensics" || stage === "typography") {
    return (
      <div className="space-y-3">
        <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest font-mono">DETECTED SIGNAL ALERTS</div>
        {stageEvidence.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 text-white/45 text-xs">
            <CheckCircle2 className="w-8 h-8 text-risk-low/80 mb-2" />
            <div className="font-semibold text-white/80">No anomalies flagged</div>
            <p className="text-[10px] text-white/40 mt-0.5">Typography and visual patterns look consistent.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {stageEvidence.map((e, idx) => {
              const active = selectedIndex === idx;
              return (
                <button
                  key={e.id}
                  onClick={() => onSelectIndex(idx)}
                  className={`w-full text-left rounded-lg p-3 border transition-all cursor-pointer ${
                    active 
                      ? "bg-accent/15 border-accent/40 shadow-sm" 
                      : "bg-white/[0.01] border-border hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white/90 truncate max-w-[180px]">{e.title}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded font-mono ${
                      e.severity === "high" || e.severity === "critical" 
                        ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>{e.severity}</span>
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{e.summary}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (stage === "structure" || stage === "consistency") {
    return (
      <div className="space-y-3">
        <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest font-mono">LAYOUT & TEXT CONGRUENCE</div>
        {stageEvidence.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 text-white/45 text-xs">
            <CheckCircle2 className="w-8 h-8 text-risk-low/80 mb-2" />
            <div className="font-semibold text-white/80">No anomalies flagged</div>
            <p className="text-[10px] text-white/40 mt-0.5">Structure alignments look consistent.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {stageEvidence.map((e) => (
              <div key={e.id} className="bg-white/[0.01] border border-border rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white/90">{e.title}</span>
                  <span className="text-[9px] text-white/40 font-mono uppercase">{e.severity}</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{e.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (stage === "metadata") {
    const meta = results.evidence.metadata;
    return (
      <div className="space-y-3">
        <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest font-mono">METADATA FIELDS</div>
        {meta?.available ? (
          <div className="space-y-3 font-mono text-[11px] leading-relaxed">
            {meta.anomaly && (
              <div className="flex items-center gap-1.5 text-xs text-risk-high bg-risk-high/15 border border-risk-high/35 rounded-lg px-3 py-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{meta.note}</span>
              </div>
            )}
            <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
              {Object.entries(meta.fields || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/20 pb-1">
                  <span className="text-white/40">{k}</span>
                  <span className={`truncate text-right max-w-[170px] ${
                    k === "Software" && meta.anomaly ? "text-risk-high font-bold" : "text-white/80"
                  }`}>
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.01] border border-border rounded-lg p-3 text-xs text-white/45 leading-relaxed font-mono">
            Metadata unavailable -- this is normal and not treated as suspicious.
          </div>
        )}
      </div>
    );
  }

  if (stage === "fusion") {
    return (
      <div className="space-y-4">
        <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest font-mono">FUSED RISK MATRIX ASSESSMENT</div>
        <ScoreCard
          authenticity={results.authenticity_score}
          risk={results.forensic_risk}
          riskLevel={results.risk_level}
          confidence={results.confidence}
        />
      </div>
    );
  }

  return null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/20 pb-1.5">
      <span className="text-white/40">{label}:</span>
      <span className="font-semibold text-white/95 truncate max-w-[185px]">{value}</span>
    </div>
  );
}
