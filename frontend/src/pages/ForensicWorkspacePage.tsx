import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileCheck2 } from "lucide-react";
import {
  analyzeDocument, getResults, documentImageUrl, STAGE_ORDER, STAGE_LABELS,
  type ResultsResponse, type StageKey,
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

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-risk-high font-medium">Analysis failed</div>
        <p className="text-white/50 max-w-md text-sm">{error}</p>
        <button onClick={() => navigate("/investigate")} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (!results || !id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Running the forensic pipeline...</p>
      </div>
    );
  }

  const stage: StageKey = STAGE_ORDER[stageIdx];
  const stageEvidence = results.evidence_list.filter((e) => e.stage === stage);
  const isLast = stageIdx === STAGE_ORDER.length - 1;

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-white/40 font-mono mb-1">{results.document.case_number}</div>
          <h1 className="text-xl font-semibold">{results.document.filename}</h1>
        </div>
        <button onClick={() => navigate(`/report/${id}`)} className="text-xs glass rounded-lg px-3 py-1.5 text-white/60 hover:text-white">
          Skip to full report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <ForensicTimeline currentIndex={stageIdx} onSelect={setStageIdx} />

        <div className="space-y-6 min-w-0">
          <StagePanel
            stage={stage}
            results={results}
            documentId={id}
            stageEvidence={stageEvidence}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStageIdx((s) => Math.max(0, s - 1))}
              disabled={stageIdx === 0}
              className="flex items-center gap-1.5 text-sm glass rounded-lg px-4 py-2.5 text-white/60 disabled:opacity-30 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Previous Stage
            </button>
            {isLast ? (
              <button
                onClick={() => navigate(`/report/${id}`)}
                className="flex items-center gap-1.5 text-sm bg-accent rounded-lg px-4 py-2.5 font-medium"
              >
                <FileCheck2 className="w-4 h-4" /> View Full Report
              </button>
            ) : (
              <button
                onClick={() => setStageIdx((s) => Math.min(STAGE_ORDER.length - 1, s + 1))}
                className="flex items-center gap-1.5 text-sm bg-accent rounded-lg px-4 py-2.5 font-medium"
              >
                Continue to {STAGE_LABELS[STAGE_ORDER[stageIdx + 1]]} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StagePanel({ stage, results, documentId, stageEvidence, selectedIndex, onSelectIndex }: {
  stage: StageKey; results: ResultsResponse; documentId: string;
  stageEvidence: ResultsResponse["evidence_list"]; selectedIndex: number | null;
  onSelectIndex: (i: number | null) => void;
}) {
  const summary = results.stage_summaries[stage];

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-5">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-1">{STAGE_LABELS[stage]}</div>
        <div className="text-lg font-medium">{summary}</div>
      </div>

      {stage === "intake" && (
        <DocumentViewer imageUrl={documentImageUrl(documentId)} pageSize={results.page_size} evidenceList={[]} />
      )}

      {stage === "ocr" && (
        <div className="glass rounded-xl p-5">
          <div className="text-xs uppercase tracking-wide text-white/40 mb-3">Extracted Text Regions</div>
          {results.ocr_words.length === 0 ? (
            <div className="text-sm text-white/40">OCR unavailable for this document.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto scrollbar-thin">
              {results.ocr_words.map((w, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm">
                  <span className="truncate font-mono text-white/80">{w.text}</span>
                  <span className="text-xs text-white/40 ml-2 shrink-0">{Math.round(w.confidence * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(stage === "visual_forensics" || stage === "typography") && (
        <DocumentViewer
          imageUrl={documentImageUrl(documentId)} pageSize={results.page_size}
          evidenceList={stageEvidence} selectedIndex={selectedIndex} onSelectIndex={onSelectIndex}
        />
      )}

      {(stage === "structure" || stage === "consistency") && (
        <div className="space-y-2">
          {stageEvidence.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center text-white/40 text-sm">No anomalies found at this stage.</div>
          ) : stageEvidence.map((e) => (
            <div key={e.id} className="glass rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{e.title}</span>
                <span className="text-xs text-white/40 uppercase">{e.severity}</span>
              </div>
              <p className="text-xs text-white/60">{e.summary}</p>
            </div>
          ))}
        </div>
      )}

      {stage === "metadata" && (
        <div className="glass rounded-xl p-5">
          <div className="text-xs uppercase tracking-wide text-white/40 mb-3">File Metadata</div>
          {results.evidence.metadata?.available ? (
            <div className="space-y-1.5 text-sm font-mono">
              {Object.entries(results.evidence.metadata.fields || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span className="text-white/40">{k}</span>
                  <span className="text-white/80 truncate">{String(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <span className="text-xs bg-white/10 rounded-full px-2 py-0.5">INFO</span>
              Metadata unavailable -- this is normal and not treated as suspicious.
            </div>
          )}
        </div>
      )}

      {stage === "fusion" && (
        <ScoreCard
          authenticity={results.authenticity_score} risk={results.forensic_risk}
          riskLevel={results.risk_level} confidence={results.confidence}
        />
      )}
    </div>
  );
}
