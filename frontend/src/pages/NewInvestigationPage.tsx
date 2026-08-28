import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Microscope, ArrowLeft, Check } from "lucide-react";
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

  async function handleSample(kind: "identity_genuine" | "identity_forged" | "certificate_forged" | "showcase_all_signals") {
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
          <div className="flex flex-wrap justify-center gap-3 text-xs text-white/40">
            <button className="underline hover:text-white/70" onClick={() => handleSample("identity_genuine")}>Sample: genuine ID</button>
            <button className="underline hover:text-white/70" onClick={() => handleSample("identity_forged")}>Sample: forged ID</button>
            <button className="underline hover:text-white/70" onClick={() => handleSample("certificate_forged")}>Sample: forged certificate</button>
            <button className="underline text-accent hover:text-accent-bright font-medium" onClick={() => handleSample("showcase_all_signals")}>
              Sample: all signals triggered (demo)
            </button>
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
      className={`relative text-left rounded-xl p-5 transition-all ${
        active
          ? "bg-accent/10 ring-2 ring-accent shadow-lg shadow-accent/20"
          : "glass hover:border-white/25 hover:bg-white/[0.03]"
      }`}
    >
      {active && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </span>
      )}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${active ? "bg-accent text-white" : "bg-white/5 text-white/50"}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className={`font-semibold mb-1 ${active ? "text-white" : "text-white/85"}`}>{title}</div>
      <div className="text-xs text-white/50 leading-relaxed">{description}</div>
    </button>
  );
}
