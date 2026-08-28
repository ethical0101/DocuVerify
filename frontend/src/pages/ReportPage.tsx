import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ListChecks, RotateCcw, Printer, FileText, ShieldAlert, Cpu } from "lucide-react";
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
    getResults(id)
      .then(setResults)
      .catch(() => setError("Could not load this investigation's results."));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950 cyber-grid">
        <div className="w-full max-w-md glass rounded-2xl p-8 border border-risk-high/30 bg-gradient-to-b from-risk-high/5 to-transparent text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-risk-high/15 border border-risk-high/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-risk-high" />
          </div>
          <h2 className="text-xl font-bold text-white">Report Unresolved</h2>
          <p className="text-sm text-white/50">{error}</p>
          <button onClick={() => navigate("/dashboard")} className="w-full rounded-lg bg-accent py-2.5 font-medium text-white transition-colors cursor-pointer">
            Return to Command Center
          </button>
        </div>
      </div>
    );
  }

  if (!results || !id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6 bg-ink-950 cyber-grid">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm font-mono">RETRIEVING FORENSIC DOSSIER...</p>
      </div>
    );
  }

  const findings = results.evidence_list.filter((e) => !e.informational);

  // Simple handler to trigger browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8 print-page">
      {/* Floating Action Bar (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5 print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-accent-bright font-mono uppercase tracking-widest">
          <FileText className="w-3.5 h-3.5" /> OFFICIAL CASE FILE REPORT
        </div>
        <div className="flex items-center gap-2.5">
          <Link 
            to={`/evidence/${id}`} 
            className="text-xs bg-white/[0.02] border border-border/80 hover:bg-white/[0.05] rounded-lg px-3.5 py-2 flex items-center gap-1.5 text-white/70 hover:text-white transition-all"
          >
            <ListChecks className="w-4 h-4 text-white/40" /> Evidence Explorer
          </Link>
          <button 
            onClick={handlePrint}
            className="text-xs bg-white/[0.02] border border-border/80 hover:bg-white/[0.05] rounded-lg px-3.5 py-2 flex items-center gap-1.5 text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white/40" /> Print Case Report
          </button>
          <button 
            onClick={() => navigate("/investigate")} 
            className="text-xs bg-accent hover:bg-accent-bright rounded-lg px-3.5 py-2 flex items-center gap-1.5 font-bold text-white transition-all shadow-md shadow-accent/15 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> New Ingestion
          </button>
        </div>
      </div>

      {/* Case Header Details */}
      <div className="bg-white/[0.01] border border-border/60 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-accent/5 filter blur-3xl pointer-events-none" />
        <CaseHeader
          caseNumber={results.document.case_number}
          filename={results.document.filename}
          category={results.document.category}
          riskLevel={results.risk_level}
          status="Analysis Complete & Logged"
        />
      </div>

      {/* Grid of Map and Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Document Evidence Viewer Map */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">
            1. DOCUMENT EVIDENCE BOUNDING MAP
          </div>
          <DocumentViewer
            imageUrl={documentImageUrl(id)}
            pageSize={results.page_size}
            evidenceList={results.evidence_list}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />
        </div>

        {/* Dynamic Key Findings check log */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">
              2. KEY FINDINGS LOG
            </div>
            <FindingList findings={findings} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
          </div>

          {/* Overall assessment Score ring gauges */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">
              3. FORENSIC SCORE SUMMARY
            </div>
            <ScoreCard
              authenticity={results.authenticity_score}
              risk={results.forensic_risk}
              riskLevel={results.risk_level}
              confidence={results.confidence}
            />
          </div>
        </div>
      </div>

      {/* Enterprise organization model layered assessment */}
      {results.enterprise_assessment && results.enterprise_assessment.authenticity_score !== undefined && (
        <div className="glass rounded-xl p-5 border border-border/60 space-y-4">
          <div>
            <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">
              4. ADAPTIVE ESTIMATOR COMPARISON
            </div>
            <p className="text-[11px] text-white/45 mt-1 leading-relaxed">
              Comparison between general base forensic classifier scores and organization model templates.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/[0.01] border border-border rounded-xl p-4 space-y-2">
              <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Base Forensic Engine</div>
              <div className="text-3xl font-black text-white font-mono">{results.authenticity_score.toFixed(0)}</div>
              <div className="text-[10px] text-white/40">authenticity rating &middot; DocuVerify general suite</div>
            </div>
            <div className="bg-accent/5 border border-accent/30 rounded-xl p-4 space-y-2">
              <div className="text-[10px] text-accent-bright uppercase font-mono tracking-wider flex items-center gap-1">
                <Cpu className="w-3 h-3 animate-pulse" /> Organization Model &middot; {results.enterprise_assessment.model_name}
              </div>
              <div className="text-3xl font-black text-accent-bright font-mono">
                {results.enterprise_assessment.authenticity_score.toFixed(0)}
              </div>
              <div className="text-[10px] text-white/45">
                authenticity rating &middot; {results.enterprise_assessment.algorithm} (v{results.enterprise_assessment.model_version})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid for Evidence Matrix and Explanation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6">
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">
            5. ANOMALY LAYER CONTRIBS
          </div>
          <EvidenceMatrix 
            evidenceList={results.evidence_list} 
            stageSummaries={results.stage_summaries}
            metadataAnomaly={results.evidence?.metadata?.anomaly} 
          />
        </div>
        
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">
            6. EXPLAINABLE NARRATION
          </div>
          <ExplanationPanel explanation={results.explanation} forgeryTypes={results.forgery_types} />
        </div>
      </div>

      {/* Collapsible technical logs and timing metrics */}
      <div className="glass rounded-xl overflow-hidden border border-border/60">
        <button
          onClick={() => setShowTechnical((s) => !s)}
          className="w-full flex items-center justify-between px-5 py-4 text-xs font-mono font-bold text-white/50 hover:text-white hover:bg-white/[0.01] transition-all cursor-pointer"
        >
          <span>SYSTEM CALIBRATION AND ENGINE DIAGNOSTIC LOGS</span>
          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-white/40">{showTechnical ? "HIDE" : "SHOW"}</span>
        </button>
        {showTechnical && (
          <div className="px-5 pb-5 pt-3 border-t border-border/40 space-y-3 text-[11px] font-mono text-white/40 bg-black/15">
            <div className="flex justify-between border-b border-border/20 pb-1">
              <span>Classifier Engine version</span>
              <span className="text-white/70">{results.model_version}</span>
            </div>
            <div className="space-y-1">
              <span>Pipeline Stage Execution Timings (ms):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {Object.entries(results.timing_ms).map(([k, v]) => (
                  <div key={k} className="bg-white/[0.01] border border-border rounded p-1.5 text-center">
                    <div className="text-[9px] text-white/30 uppercase">{k}</div>
                    <div className="font-bold text-white/80 mt-0.5">{v}ms</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable forensic limitation warning */}
      <div className="text-center text-[10px] text-white/30 border-t border-border/20 pt-6 pb-4 font-mono uppercase">
        FORENSIC DECISION SUPPORT DOCUMENT &middot; STRICTLY DEPICTS SIGNAL ALERTS &middot; HUMAN REVIEW MANDATORY
      </div>
    </div>
  );
}
