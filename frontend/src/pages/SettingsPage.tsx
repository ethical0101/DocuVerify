export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Settings</h1>
      <p className="text-white/50 text-sm mb-8">System configuration for this DocuVerify instance.</p>

      <div className="glass rounded-xl p-5 space-y-4">
        <Row label="LLM-narrated explanations" value="Configured via LLM_PROVIDER / LLM_API_KEY in backend/.env (optional)" />
        <Row label="Max upload size" value="25 MB" />
        <Row label="Supported formats" value="PDF, PNG, JPG, JPEG" />
        <Row label="Processing" value="Local (this machine) by default" />
      </div>

      <p className="text-xs text-white/30 mt-4">
        DocuVerify is a research/hackathon prototype. See About &amp; Limitations for the full privacy
        and security posture.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className="text-white/50">{label}</span>
      <span className="text-white/80 text-right">{value}</span>
    </div>
  );
}
