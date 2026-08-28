import { useState } from "react";
import Landing from "./components/Landing";
import UploadZone from "./components/UploadZone";
import AnalyzingScreen from "./components/AnalyzingScreen";
import ResultsDashboard from "./components/ResultsDashboard";
import { uploadDocument, analyzeDocument, getResults, type ResultsResponse } from "./api/client";
import type { AppStage } from "./types";
import { ArrowLeft } from "lucide-react";

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

  async function runSample(kind: "identity_genuine" | "identity_forged" | "certificate_forged") {
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-8">
        <button onClick={() => setStage("landing")} className="fixed top-6 left-6 flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Upload a document</h2>
          <p className="text-white/50 text-sm">PDF, PNG, or JPG &middot; identity or educational documents</p>
        </div>
        <UploadZone onFile={runAnalysis} />
        <div className="flex gap-3 text-xs text-white/40">
          <button className="underline hover:text-white/70" onClick={() => runSample("identity_genuine")}>Sample: genuine ID</button>
          <button className="underline hover:text-white/70" onClick={() => runSample("identity_forged")}>Sample: forged ID</button>
          <button className="underline hover:text-white/70" onClick={() => runSample("certificate_forged")}>Sample: forged certificate</button>
        </div>
      </div>
    );
  }

  if (stage === "analyzing") {
    return <AnalyzingScreen />;
  }

  if (stage === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-risk-high font-medium">Analysis failed</div>
        <p className="text-white/50 max-w-md text-sm">{error}</p>
        <button onClick={reset} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium">Try again</button>
      </div>
    );
  }

  if (stage === "results" && results && documentId) {
    return <ResultsDashboard documentId={documentId} results={results} onReset={reset} />;
  }

  return null;
}
