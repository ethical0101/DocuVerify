import { RotateCcw } from "lucide-react";
import type { ResultsResponse } from "../api/client";
import { documentImageUrl } from "../api/client";
import PortalHeader from "./PortalHeader";
import ScoreGauge from "./ScoreGauge";
import EvidenceBreakdown from "./EvidenceBreakdown";
import DocumentViewer from "./DocumentViewer";
import ExplanationPanel from "./ExplanationPanel";
import ProvenancePanel from "./ProvenancePanel";

export default function ResultsDashboard({
  documentId, results, onReset,
}: { documentId: string; results: ResultsResponse; onReset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <PortalHeader onBack={onReset} backLabel="Analyze another" />

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-brand-600 font-semibold">{results.document.category} document</div>
            <h1 className="text-2xl font-bold text-brand-900 truncate">{results.document.filename}</h1>
          </div>
          <button onClick={onReset} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white flex items-center gap-2 hover:bg-brand-700 transition shrink-0">
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

          <ProvenancePanel documentId={documentId} />

          <div className="text-center text-xs text-muted pb-6">
            Model: {results.model_version} &middot; This is a forensic risk assessment from a hackathon
            prototype, not an official verification. A human verifier should make the final decision.
          </div>
        </div>
      </main>
    </div>
  );
}
