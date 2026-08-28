import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ListChecks, RotateCcw } from "lucide-react";
import { getResults, documentImageUrl, type ResultsResponse } from "../api/client";
import CaseHeader from "../components/CaseHeader";
import DocumentViewer from "../components/DocumentViewer";
import FindingList from "../components/FindingList";
import ScoreCard from "../components/ScoreCard";
import EvidenceMatrix from "../components/EvidenceMatrix";
import ExplanationPanel from "../components/ExplanationPanel";

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  useEffect(() => {
    if (!id) return;
    getResults(id).then(setResults).catch(() => setError("Could not load this investigation's results."));
  }, [id]);

  if (error) {
    return <div className="p-10 text-center text-risk-high text-sm">{error}</div>;
  }
  if (!results || !id) {
    return <div className="p-10 text-center text-white/40 text-sm">Loading investigation...</div>;
  }

  const findings = results.evidence_list.filter((e) => !e.informational);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-white/30">Forensic Investigation</span>
        <div className="flex gap-2">
          <Link to={`/evidence/${id}`} className="text-xs glass rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-white/60 hover:text-white">
            <ListChecks className="w-3.5 h-3.5" /> Evidence Explorer
          </Link>
          <button onClick={() => navigate("/investigate")} className="text-xs glass rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-white/60 hover:text-white">
            <RotateCcw className="w-3.5 h-3.5" /> New Investigation
          </button>
        </div>
      </div>

      <CaseHeader
        caseNumber={results.document.case_number}
        filename={results.document.filename}
        category={results.document.category}
        riskLevel={results.risk_level}
        status="Analysis Complete"
      />

      {/* 1. Document Evidence Map */}
      <section>
        <DocumentViewer
          imageUrl={documentImageUrl(id)}
          pageSize={results.page_size}
          evidenceList={results.evidence_list}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
        />
      </section>

      {/* 2. Interactive findings, synced with the viewer above */}
      <section>
        <FindingList findings={findings} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
      </section>

      {/* 3. Overall assessment */}
      <section>
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3">Overall Assessment</div>
        <ScoreCard
          authenticity={results.authenticity_score}
          risk={results.forensic_risk}
          riskLevel={results.risk_level}
          confidence={results.confidence}
        />
      </section>

      {/* 4. Evidence matrix */}
      <section>
        <EvidenceMatrix evidenceList={results.evidence_list} stageSummaries={results.stage_summaries} />
      </section>

      {/* 5. Explanation + recommended human checks */}
      <section>
        <ExplanationPanel explanation={results.explanation} forgeryTypes={results.forgery_types} />
      </section>

      {/* 6. Technical details (collapsible) */}
      <section className="glass rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowTechnical((s) => !s)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm text-white/60 hover:text-white"
        >
          Technical Details
          <span className="text-xs text-white/30">{showTechnical ? "Hide" : "Show"}</span>
        </button>
        {showTechnical && (
          <div className="px-6 pb-6 space-y-3 text-xs font-mono text-white/50">
            <div>Model version: {results.model_version}</div>
            <div>Stage timing (ms): {JSON.stringify(results.timing_ms)}</div>
            <div>Stage summaries: {JSON.stringify(results.stage_summaries, null, 2)}</div>
          </div>
        )}
      </section>

      <div className="text-center text-xs text-white/30 pb-6">
        This is a forensic risk assessment from a hackathon prototype, not an official verification.
        Human verification is recommended before relying on this assessment.
      </div>
    </div>
  );
}
