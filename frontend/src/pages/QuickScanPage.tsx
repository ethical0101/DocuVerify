import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-risk-high font-medium">Analysis failed</div>
        <p className="text-white/50 max-w-md text-sm">{error}</p>
        <button onClick={() => navigate("/investigate")} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  return <AnalyzingScreen />;
}
