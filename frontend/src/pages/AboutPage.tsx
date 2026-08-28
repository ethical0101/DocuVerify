import { BookOpen, ShieldAlert, Database, HelpCircle, EyeOff } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> SYSTEM RESEARCH OVERVIEW
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">About DocuVerify</h1>
        <p className="text-white/50 text-sm mt-1">
          Learn how DocuVerify processes multi-signal forensic evidence to support document verification workflows.
        </p>
      </div>

      <div className="space-y-6">
        {/* Intro */}
        <p className="text-sm text-white/60 leading-relaxed">
          DocuVerify is a research/hackathon prototype built to demonstrate AI-assisted forensic analysis of identity documents and educational certificates. It combines classical computer vision algorithms, OCR alignment geometry, EXIF stream audits, and transparent evidence fusion to produce a relative forensic risk assessment rather than an arbitrary binary decision.
        </p>

        {/* Section 1: Limits */}
        <div className="glass rounded-xl p-5 border border-risk-high/30 bg-gradient-to-br from-risk-high/5 to-transparent space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 text-risk-high" />
            <span className="text-xs font-bold text-risk-high uppercase font-mono tracking-wider">
              Critical System Disclaimers
            </span>
          </div>
          <ul className="space-y-2 text-xs text-white/60 list-disc list-inside leading-relaxed">
            <li>Not connected to government database registries (passport records, Aadhaar, DMV, etc.).</li>
            <li>Does not guarantee legal document authenticity -- serves as a verification alert assistant.</li>
            <li>Optimized for demo purposes on synthetic layouts generated during project setup.</li>
          </ul>
        </div>

        {/* Section 2: Human in the Loop */}
        <Section icon={HelpCircle} title="Human-in-the-Loop Integrity">
          <p className="text-xs text-white/60 leading-relaxed">
            All reports outputted by DocuVerify contain an explicit assessment confidence metrics track. Low quality scans or highly blurred images are labeled as uncertain low-confidence files, warning verification personnel to manually inspect credentials rather than relying on automatic classifiers.
          </p>
        </Section>

        {/* Section 3: Privacy */}
        <Section icon={EyeOff} title="Data Privacy Framework">
          <p className="text-xs text-white/60 leading-relaxed">
            Case files are processed on local host pipelines. Raw images never leave the application server. If Groq/Gemini narration APIs are configured, only structured JSON metadata arrays are processed to generate textual summaries.
          </p>
        </Section>

        {/* Section 4: Datasets */}
        <Section icon={Database} title="Synthetic Training Datasets">
          <p className="text-xs text-white/60 leading-relaxed">
            All document templates and forgeries processed in this local server are synthetic datasets populated during initialization. Real personal identifiers or government structures are completely omitted.
          </p>
        </Section>
      </div>

      <div className="text-[10px] text-white/30 border-t border-border/20 pt-5 font-mono uppercase text-center">
        DOCUVERIFY SECURITY PROTOCOL &middot; RESEARCH WORKBENCH ONLY
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-5 border border-border/60 bg-white/[0.01] space-y-2.5">
      <div className="flex items-center gap-2 text-white/40">
        <Icon className="w-4 h-4 text-accent-bright" />
        <h3 className="text-[10px] font-bold uppercase tracking-widest font-mono">{title}</h3>
      </div>
      {children}
    </div>
  );
}
