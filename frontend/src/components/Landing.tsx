import { motion } from "framer-motion";
import {
  ScanSearch,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileSearch,
  LockKeyhole,
} from "lucide-react";

export default function Landing({
  onStart,
  onDemo,
}: {
  onStart: () => void;
  onDemo: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Tricolour trim */}
      <div className="gov-ribbon" />

      {/* Top navigation bar (DigiLocker-style) */}
      <header className="bg-panel border-b border-border">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg brand-gradient flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight text-brand-800">
                DocuVerify
              </div>
              <div className="text-[11px] text-muted">
                Document Forensics Portal
              </div>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-muted">
            <a className="hover:text-brand-700 transition" href="#how">
              How it works
            </a>
            <a className="hover:text-brand-700 transition" href="#trust">
              Trust &amp; Safety
            </a>
            <button
              onClick={onStart}
              className="rounded-md bg-brand-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-brand-700 transition"
            >
              Verify a Document
            </button>
          </nav>
        </div>
      </header>

      {/* Hero band */}
      <section className="brand-gradient text-white">
        <div className="max-w-7xl mx-auto w-full px-6 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium mb-6 backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" />
              Multi-signal forensic analysis, not a black-box classifier
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
              Verify identity &amp; education documents with confidence
            </h1>
            <p className="text-lg text-white/85 mb-8 max-w-xl leading-relaxed">
              Upload a document and get a transparent forensic risk assessment —
              the authenticity score, the exact regions that raised concern, and
              a plain-language explanation of why.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onStart}
                className="group flex items-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-brand-800 shadow-lg transition hover:bg-brand-50"
              >
                Verify a Document
                <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={onDemo}
                className="rounded-md border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20 backdrop-blur"
              >
                Try a Sample Document
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="hidden lg:block"
          >
            <div className="card p-6 text-ink">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                  <FileSearch className="w-4 h-4" /> Forensic Risk Assessment
                </div>
                <span className="text-[11px] rounded-full bg-risk-low/10 text-risk-low px-2.5 py-0.5 font-semibold">
                  LOW RISK
                </span>
              </div>
              <div className="flex items-center gap-4 mb-5">
                <div className="relative w-20 h-20 shrink-0">
                  <svg
                    viewBox="0 0 120 120"
                    className="w-full h-full -rotate-90"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#e2f0fc"
                      strokeWidth="12"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="12"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * 0.08}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-brand-900">
                    92%
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {[
                    ["Visual", 12],
                    ["Typography", 8],
                    ["Structure", 15],
                    ["Metadata", 5],
                  ].map(([l, v]) => (
                    <div key={l as string}>
                      <div className="flex justify-between text-[11px] text-muted mb-0.5">
                        <span>{l}</span>
                        <span>{v}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-brand-100 overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${v as number}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Illustrative preview. Every score traces back to structured
                evidence — never invented.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature cards */}
      <main id="how" className="flex-1 max-w-7xl mx-auto w-full px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-brand-900 mb-2">
            Investigation, not just a verdict
          </h2>
          <p className="text-muted max-w-2xl mx-auto">
            Most forgery detectors output a single number. DocuVerify shows
            where, what kind, and why.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: ScanSearch,
              title: "Region-level localization",
              body: "See exactly where the suspicious signal is on the document, not just a verdict.",
            },
            {
              icon: Sparkles,
              title: "Explainable evidence",
              body: "Every score traces back to visual, typographic, structural, and textual signals.",
            },
            {
              icon: LockKeyhole,
              title: "Human-in-the-loop",
              body: "A forensic risk assessment to support a human verifier's decision, not replace it.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card p-6 text-left hover:shadow-md transition"
            >
              <div className="w-11 h-11 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <div className="font-semibold text-brand-900 mb-1.5">
                {f.title}
              </div>
              <div className="text-sm text-muted leading-relaxed">{f.body}</div>
            </div>
          ))}
        </div>
      </main>

      <footer id="trust" className="bg-brand-950 text-white/70">
        <div className="max-w-7xl mx-auto w-full px-6 py-8 text-center text-xs leading-relaxed">
          <div className="text-white/90 font-semibold mb-1">
            DocuVerify — Research Prototype
          </div>
          Identity/certificate samples in this demo are synthetic and fictional.
          This is a 24-hour hackathon prototype, not an official government
          verification service.
        </div>
      </footer>
    </div>
  );
}
