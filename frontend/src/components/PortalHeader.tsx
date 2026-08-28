import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function PortalHeader({ onBack, backLabel }: { onBack?: () => void; backLabel?: string }) {
  return (
    <>
      <div className="gov-ribbon" />
      <header className="bg-panel border-b border-border sticky top-0 z-20">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg brand-gradient flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight text-brand-800">DocuVerify</div>
              <div className="text-[11px] text-muted">Document Forensics Portal</div>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-muted hover:text-brand-700 transition"
            >
              <ArrowLeft className="w-4 h-4" /> {backLabel ?? "Back"}
            </button>
          )}
        </div>
      </header>
    </>
  );
}
