import { Settings, HelpCircle } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" /> SYSTEM METRICS
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Settings</h1>
        <p className="text-white/50 text-sm mt-1">System configuration settings resolved for this DocuVerify instance.</p>
      </div>

      <div className="glass rounded-xl p-5 border border-border/60 bg-white/[0.01] space-y-4">
        <Row label="LLM Narration" value="Configured via LLM_PROVIDER in backend environment variables (optional)" />
        <Row label="Intake Threshold Limit" value="25 MB" />
        <Row label="Supported File MIME" value="PDF, PNG, JPG, JPEG" />
        <Row label="Pipeline Engine Processing" value="Local Execution (SQLite & local OCR/CV models)" />
      </div>

      <div className="flex items-start gap-2 text-xs text-white/35 font-mono uppercase border-t border-border/20 pt-5">
        <HelpCircle className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
        <span>DocuVerify is a research prototype. Security configurations are stored in the deployment.yaml template.</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs border-b border-border/20 pb-3 last:border-0 last:pb-0 gap-1.5">
      <span className="font-bold text-white/40 uppercase font-mono tracking-wide">{label}</span>
      <span className="text-white/85 text-left sm:text-right font-sans font-medium">{value}</span>
    </div>
  );
}
