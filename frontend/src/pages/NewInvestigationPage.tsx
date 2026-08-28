import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Microscope, ArrowLeft, Check, Sparkles, AlertCircle } from "lucide-react";
import UploadZone from "../components/UploadZone";
import { uploadDocument } from "../api/client";

type Mode = "quick" | "forensic";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring" as const, stiffness: 100, damping: 15 } 
  }
};

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-16 relative"
    >
      <button 
        onClick={() => navigate("/dashboard")} 
        className="fixed top-6 left-6 flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors cursor-pointer z-20"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <motion.div variants={itemVariants} className="text-center space-y-2 z-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/30 px-3 py-1 text-xs text-accent-bright font-mono">
          <Sparkles className="w-3.5 h-3.5" /> FORENSIC INGESTION LAB
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">New Investigation</h1>
        <p className="text-white/50 text-sm max-w-md mx-auto">
          Ingest a new case file and select your analysis workspace route.
        </p>
      </motion.div>

      {/* Mode Selection Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl z-10">
        <ModeCard
          icon={Zap} 
          title="Quick Scan" 
          active={mode === "quick"} 
          onClick={() => setMode("quick")}
          description="Runs the full pipeline automatically and jumps straight to the final report."
        />
        <ModeCard
          icon={Microscope} 
          title="Forensic Workspace" 
          active={mode === "forensic"} 
          onClick={() => setMode("forensic")}
          description="Walk through intake, OCR, visual forensics, typography, structure, metadata and consistency one stage at a time."
        />
      </motion.div>

      {error && (
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-2 text-sm text-risk-high bg-risk-high/15 border border-risk-high/30 rounded-lg px-4 py-3 max-w-2xl w-full z-10"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {uploading ? (
        <div className="flex flex-col items-center gap-3 py-10 z-10">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 text-sm font-mono">STAGING DOCUMENT FOR ANALYSIS...</p>
        </div>
      ) : (
        <motion.div variants={itemVariants} className="w-full space-y-6 z-10">
          <UploadZone onFile={handleFile} />
          
          {/* Sample Documents Section */}
          <div className="max-w-2xl mx-auto px-6 space-y-3">
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest font-mono text-center">
              OR TEST RUN WITH DEMO SAMPLES
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <SampleButton label="Genuine ID" onClick={() => handleSample("identity_genuine")} />
              <SampleButton label="Forged ID" onClick={() => handleSample("identity_forged")} danger />
              <SampleButton label="Forged Cert" onClick={() => handleSample("certificate_forged")} danger />
              <SampleButton label="All Signals (Demo)" onClick={() => handleSample("showcase_all_signals")} highlighted />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ModeCard({ icon: Icon, title, description, active, onClick }: {
  icon: any; title: string; description: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-xl p-5 transition-all duration-300 select-card cursor-pointer ${
        active
          ? "select-card-active gradient-border shadow-lg shadow-accent/5"
          : "select-card-inactive glass"
      }`}
    >
      {active && (
        <span className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />
        </span>
      )}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
        active 
          ? "bg-accent/15 border border-accent/40 text-accent-bright" 
          : "bg-white/5 text-white/40 border border-transparent"
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className={`font-bold mb-1 text-sm tracking-tight ${active ? "text-white" : "text-white/80"}`}>{title}</div>
      <div className="text-xs text-white/45 leading-relaxed">{description}</div>
    </button>
  );
}

function SampleButton({ label, onClick, danger, highlighted }: { 
  label: string; onClick: () => void; danger?: boolean; highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg p-2.5 text-center border transition-all hover:bg-white/[0.04] cursor-pointer font-medium hover:scale-102 ${
        highlighted 
          ? "bg-accent/10 border-accent/30 text-accent-bright hover:border-accent/60" 
          : danger 
            ? "bg-risk-high/5 border-risk-high/20 text-risk-high/80 hover:border-risk-high/40" 
            : "bg-white/[0.01] border-border/60 text-white/60 hover:border-white/30"
      }`}
    >
      {label}
    </button>
  );
}
