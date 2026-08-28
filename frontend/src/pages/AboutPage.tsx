export default function AboutPage() {
  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">About DocuVerify</h1>
        <p className="text-white/60 leading-relaxed">
          DocuVerify is a research/hackathon prototype for AI-assisted forensic analysis of identity
          documents and educational certificates. It combines classical computer vision, OCR-derived
          statistics, and transparent evidence fusion to produce a forensic risk assessment -- not a
          binary fake/genuine verdict.
        </p>
      </div>

      <Section title="What DocuVerify is NOT">
        <ul className="space-y-1.5 text-white/60 text-sm list-disc list-inside">
          <li>Not an official government verification service</li>
          <li>Not connected to any real identity database (Aadhaar, Passport Seva, DMV, etc.)</li>
          <li>Not a guarantee of authenticity or forgery -- a decision-support signal for a human reviewer</li>
          <li>Not validated on real-world scanned/photographed documents -- only on this project's synthetic dataset</li>
        </ul>
      </Section>

      <Section title="Human-in-the-Loop">
        <p className="text-white/60 text-sm leading-relaxed">
          Every assessment DocuVerify produces is a forensic risk assessment, with an explicit assessment
          confidence separate from the risk score itself. A low-confidence result (e.g. a poor-quality
          scan) is flagged as uncertain rather than being forced into a high or low risk bucket. A human
          verifier should always make the final call.
        </p>
      </Section>

      <Section title="Privacy">
        <p className="text-white/60 text-sm leading-relaxed">
          Documents are processed locally by default. No document content leaves the machine unless an
          LLM provider is explicitly configured for explanation narration -- and even then, only the
          already-computed structured evidence is sent, never the raw image. See <code>SECURITY.md</code> in
          the repository for the full threat model.
        </p>
      </Section>

      <Section title="Datasets">
        <p className="text-white/60 text-sm leading-relaxed">
          All identity cards and certificates used in this build are synthetic and fictional, generated
          by this project's own scripts (<code>scripts/generate_synthetic_documents.py</code>,
          <code> scripts/generate_forgeries.py</code>). See <code>DATASETS.md</code> for the full
          methodology, including which external datasets were considered and why they were not
          downloaded in this build.
        </p>
      </Section>

      <Section title="Supported Document Categories">
        <p className="text-white/60 text-sm leading-relaxed">
          Identity documents (national ID-card-style layouts) and educational certificates. Other
          document types are out of scope for this prototype.
        </p>
      </Section>

      <div className="pt-4 border-t border-white/10 text-xs text-white/40">
        DocuVerify is a research/hackathon prototype and is not an official government verification
        service.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm uppercase tracking-wide text-white/40 mb-2">{title}</h2>
      {children}
    </div>
  );
}
