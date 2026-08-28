import { useState } from "react";
import Landing from "./components/Landing";
import UploadZone from "./components/UploadZone";
import AnalyzingScreen from "./components/AnalyzingScreen";
import ResultsDashboard from "./components/ResultsDashboard";
import PortalHeader from "./components/PortalHeader";
import { uploadDocument, analyzeDocument, getResults, type ResultsResponse } from "./api/client";
import type { AppStage } from "./types";
import { AlertTriangle, FileCheck2, IdCard, GraduationCap } from "lucide-react";

export default function App() {
  const [stage, setStage] = useState<AppStage>("landing");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis(file: File) {
    setStage("analyzing");
    setError(null);
    try {
      const uploaded = await uploadDocument(file);
      setDocumentId(uploaded.id);
      await analyzeDocument(uploaded.id);
      const res = await getResults(uploaded.id);
      setResults(res);
      setStage("results");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Analysis failed. Please try again.");
      setStage("error");
    }
  }

  async function runSample(kind: "identity_genuine" | "identity_forged" | "certificate_genuine" | "certificate_forged") {
    setStage("analyzing");
    setError(null);
    try {
      const res = await fetch(`/samples/${kind}.png`);
      const blob = await res.blob();
      const file = new File([blob], `${kind}.png`, { type: "image/png" });
      await runAnalysis(file);
    } catch {
      setError("Could not load the sample document.");
      setStage("error");
    }
  }

  function reset() {
    setStage("upload");
    setDocumentId(null);
    setResults(null);
    setError(null);
  }

  if (stage === "landing") {
    return <Landing onStart={() => setStage("upload")} onDemo={() => runSample("identity_forged")} />;
  }

  if (stage === "upload") {
    return (
      <div className="min-h-screen flex flex-col bg-surface">
        <PortalHeader onBack={() => setStage("landing")} backLabel="Home" />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-700 px-3 py-1 text-xs font-semibold mb-3">
              <FileCheck2 className="w-3.5 h-3.5" /> Secure document verification
            </div>
            <h2 className="text-2xl font-bold text-brand-900 mb-2">Upload a document to verify</h2>
            <p className="text-muted text-sm">PDF, PNG, or JPG &middot; identity or educational documents</p>
          </div>

          <UploadZone onFile={runAnalysis} />

          <div className="mt-8">
            <div className="text-center text-xs uppercase tracking-wide text-muted mb-3">Or try a sample document</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={() => runSample("identity_genuine")} className="card p-4 flex items-center gap-3 text-left hover:shadow-md transition">
                <IdCard className="w-5 h-5 text-brand-600 shrink-0" />
                <span className="text-sm font-medium text-brand-900">Genuine ID</span>
              </button>
              <button onClick={() => runSample("identity_forged")} className="card p-4 flex items-center gap-3 text-left hover:shadow-md transition">
                <IdCard className="w-5 h-5 text-risk-high shrink-0" />
                <span className="text-sm font-medium text-brand-900">Forged ID</span>
              </button>
              <button onClick={() => runSample("certificate_genuine")} className="card p-4 flex items-center gap-3 text-left hover:shadow-md transition">
                <GraduationCap className="w-5 h-5 text-brand-600 shrink-0" />
                <span className="text-sm font-medium text-brand-900">Genuine certificate</span>
              </button>
              <button onClick={() => runSample("certificate_forged")} className="card p-4 flex items-center gap-3 text-left hover:shadow-md transition">
                <GraduationCap className="w-5 h-5 text-risk-high shrink-0" />
                <span className="text-sm font-medium text-brand-900">Forged certificate</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (stage === "analyzing") {
    return <AnalyzingScreen />;
  }

  if (stage === "error") {
    return (
      <div className="min-h-screen flex flex-col bg-surface">
        <PortalHeader onBack={() => setStage("landing")} backLabel="Home" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-risk-high/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-risk-high" />
          </div>
          <div className="text-risk-high font-semibold text-lg">Analysis failed</div>
          <p className="text-muted max-w-md text-sm">{error}</p>
          <button onClick={reset} className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (stage === "results" && results && documentId) {
    return <ResultsDashboard documentId={documentId} results={results} onReset={reset} />;
  }

  return null;
}
