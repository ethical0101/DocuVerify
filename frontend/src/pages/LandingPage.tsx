import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScanSearch, ShieldCheck, Sparkles, ArrowRight, Search, MapPin, MessageSquareText, UserCheck } from "lucide-react";

const WORKFLOW = [
  { icon: Search, label: "Detect" },
  { icon: MapPin, label: "Localize" },
  { icon: Sparkles, label: "Diagnose" },
  { icon: MessageSquareText, label: "Explain" },
  { icon: UserCheck, label: "Assist Human Verification" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ScanSearch className="w-5 h-5 text-accent" />
          DocuVerify
        </div>
        <div className="text-xs text-white/40 font-mono">research prototype &middot; not an official verification service</div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 text-center pb-20">
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-white/60 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Multi-signal forensic analysis, not a black-box classifier
            </div>
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight mb-5">DocuVerify</h1>
            <p className="text-xl sm:text-2xl text-white/70 mb-4">
              Don't just verify documents. <span className="text-white">Investigate them.</span>
            </p>
            <p className="text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
              AI-powered forensic analysis for identity and educational documents. Upload &rarr; analyze &rarr;
              investigate &rarr; understand &rarr; decide.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate("/investigate")}
                className="group flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
              >
                Analyze a Document
                <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => navigate("/investigate")}
                className="rounded-lg glass px-6 py-3 font-medium text-white/80 transition hover:text-white hover:border-white/20"
              >
                Try a Sample
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 max-w-4xl w-full"
          >
            {[
              { icon: ScanSearch, title: "Region-level localization", body: "We show where the suspicious signal is, not just a verdict." },
              { icon: Sparkles, title: "Explainable evidence", body: "Every score traces back to visual, typographic, structural, and textual signals." },
              { icon: ShieldCheck, title: "Human-in-the-loop", body: "A forensic risk assessment to support a human verifier, not replace one." },
            ].map((f) => (
              <div key={f.title} className="glass rounded-xl p-5 text-left">
                <f.icon className="w-5 h-5 text-accent mb-3" />
                <div className="font-medium mb-1">{f.title}</div>
                <div className="text-sm text-white/50 leading-relaxed">{f.body}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 max-w-4xl w-full"
        >
          <div className="text-xs uppercase tracking-widest text-white/30 mb-6">How It Works</div>
          <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-0">
            {WORKFLOW.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-2 px-2">
                  <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-xs text-white/50 max-w-[80px]">{step.label}</span>
                </div>
                {i < WORKFLOW.length - 1 && <ArrowRight className="w-4 h-4 text-white/15 mx-1 sm:mx-2" />}
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      <footer className="text-center text-xs text-white/30 py-6">
        Identity/certificate samples in this demo are synthetic and fictional. This is a 24-hour hackathon
        prototype, not a production fraud-detection system.
      </footer>
    </div>
  );
}
