import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import AnalyzingScreen from "../components/AnalyzingScreen";
import { analyzeDocument } from "../api/client";

export default function QuickScanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!id || started.current) return;
    started.current = true;
    analyzeDocument(id)
      .then(() => navigate(`/report/${id}`, { replace: true }))
      .catch((e) => setError(e?.response?.data?.detail ?? "Analysis failed. Please try again."));
  }, [id, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-ink-950 cyber-grid">
        <div className="w-full max-w-md glass rounded-2xl p-8 border border-risk-high/30 bg-gradient-to-b from-risk-high/5 to-transparent text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-risk-high/15 border border-risk-high/30 flex items-center justify-center mx-auto shadow-lg shadow-risk-high/5">
            <ShieldAlert className="w-6 h-6 text-risk-high" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Analysis Interrupted</h2>
            <p className="text-xs text-white/40 font-mono uppercase tracking-wider">PIPELINE EXECUTION ERROR</p>
            <p className="text-sm text-white/60 leading-relaxed pt-2">
              We couldn't complete the automated forensic stage due to an ingestion anomaly.
            </p>
          </div>

          <div className="bg-black/30 border border-border rounded-lg p-3 text-left font-mono text-[11px] text-white/50 break-all">
            {error}
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              to="/investigate"
              className="flex-1 rounded-lg border border-border bg-white/[0.02] hover:bg-white/[0.05] py-2.5 text-xs font-semibold text-white/70 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Ingestion
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-lg bg-accent hover:bg-accent-bright py-2.5 text-xs font-semibold text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-accent/15"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AnalyzingScreen />;
}
