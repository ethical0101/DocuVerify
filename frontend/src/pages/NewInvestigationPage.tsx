import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Microscope, ArrowLeft } from "lucide-react";
import UploadZone from "../components/UploadZone";
import { uploadDocument } from "../api/client";

type Mode = "quick" | "forensic";

export default function NewInvestigationPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("quick");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadDocument(file);
      if (mode === "quick") {
        navigate(`/investigate/quick/${uploaded.id}`);
      } else {
        navigate(`/investigate/forensic/${uploaded.id}`);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Upload failed. Please try again.");
      setUploading(false);
    }
  }

  async function handleSample(kind: "identity_genuine" | "identity_forged" | "certificate_forged") {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/samples/${kind}.png`);
      const blob = await res.blob();
      const file = new File([blob], `${kind}.png`, { type: "image/png" });
      await handleFile(file);
    } catch {
      setError("Could not load the sample document.");
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-16">
      <button onClick={() => navigate("/dashboard")} className="fixed top-6 left-6 flex items-center gap-2 text-sm text-white/50 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">New Investigation</h1>
        <p className="text-white/50 text-sm">Choose how you want to run the forensic pipeline.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        <ModeCard
          icon={Zap} title="Quick Scan" active={mode === "quick"} onClick={() => setMode("quick")}
          description="Runs the full pipeline automatically and jumps straight to the final report."
        />
        <ModeCard
          icon={Microscope} title="Forensic Investigation" active={mode === "forensic"} onClick={() => setMode("forensic")}
          description="Walk through intake, OCR, visual forensics, typography, structure, metadata and consistency one stage at a time."
        />
      </div>

      {error && <div className="text-risk-high text-sm">{error}</div>}

      {uploading ? (
        <div className="text-white/50 text-sm">Uploading...</div>
      ) : (
        <>
          <UploadZone onFile={handleFile} />
          <div className="flex gap-3 text-xs text-white/40">
            <button className="underline hover:text-white/70" onClick={() => handleSample("identity_genuine")}>Sample: genuine ID</button>
            <button className="underline hover:text-white/70" onClick={() => handleSample("identity_forged")}>Sample: forged ID</button>
            <button className="underline hover:text-white/70" onClick={() => handleSample("certificate_forged")}>Sample: forged certificate</button>
          </div>
        </>
      )}
    </div>
  );
}

function ModeCard({ icon: Icon, title, description, active, onClick }: {
  icon: any; title: string; description: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left glass rounded-xl p-5 transition border-2 ${
        active ? "border-accent bg-accent/5" : "border-transparent hover:border-white/15"
      }`}
    >
      <Icon className={`w-5 h-5 mb-3 ${active ? "text-accent" : "text-white/50"}`} />
      <div className="font-medium mb-1">{title}</div>
      <div className="text-xs text-white/50 leading-relaxed">{description}</div>
    </button>
  );
}
