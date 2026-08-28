import { ArrowLeft, RotateCcw } from "lucide-react";
import type { ResultsResponse } from "../api/client";
import { documentImageUrl } from "../api/client";
import ScoreGauge from "./ScoreGauge";
import EvidenceBreakdown from "./EvidenceBreakdown";
import DocumentViewer from "./DocumentViewer";
import ExplanationPanel from "./ExplanationPanel";

export default function ResultsDashboard({
  documentId, results, onReset,
}: { documentId: string; results: ResultsResponse; onReset: () => void }) {
  return (
    <div className="min-h-screen px-6 py-8 max-w-6xl mx-auto">
      <button onClick={onReset} className="flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Analyze another document
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/40">{results.document.category} document</div>
          <h1 className="text-2xl font-semibold">{results.document.filename}</h1>
        </div>
        <button onClick={onReset} className="rounded-lg glass px-4 py-2 text-sm flex items-center gap-2 hover:border-white/20">
          <RotateCcw className="w-3.5 h-3.5" /> New Analysis
        </button>
      </div>

      <div className="space-y-6">
        <ScoreGauge score={results.authenticity_score} risk={results.risk_level} confidence={results.confidence} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DocumentViewer
              imageUrl={documentImageUrl(documentId)}
              pageSize={results.page_size}
              regions={results.regions}
            />
          </div>
          <EvidenceBreakdown evidence={results.evidence} />
        </div>

        <ExplanationPanel explanation={results.explanation} forgeryTypes={results.forgery_types} />

        <div className="text-center text-xs text-white/30 pb-6">
          Model: {results.model_version} &middot; This is a forensic risk assessment from a hackathon
          prototype, not an official verification. A human verifier should make the final decision.
        </div>
      </div>
    </div>
  );
}
