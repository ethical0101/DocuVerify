import { motion } from "framer-motion";
import { ScanSearch, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function Landing({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ScanSearch className="w-5 h-5 text-accent" />
          DocuVerify
        </div>
        <div className="text-xs text-white/40 font-mono">research prototype &middot; not an official verification service</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
            localize &rarr; diagnose &rarr; explain.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onStart}
              className="group flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
            >
              Analyze a Document
              <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={onDemo}
              className="rounded-lg glass px-6 py-3 font-medium text-white/80 transition hover:text-white hover:border-white/20"
            >
              Try a Sample Document
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
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
      </main>

      <footer className="text-center text-xs text-white/30 py-6">
        Identity/certificate samples in this demo are synthetic and fictional. This is a 24-hour hackathon
        prototype, not a production fraud-detection system.
      </footer>
    </div>
  );
}
