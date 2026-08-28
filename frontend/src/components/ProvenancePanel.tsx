import { useEffect, useState } from "react";
import { Fingerprint, ShieldCheck, ShieldAlert } from "lucide-react";
import { getProvenance, type ProvenanceResponse } from "../api/client";

export default function ProvenancePanel({ documentId }: { documentId: string }) {
  const [prov, setProv] = useState<ProvenanceResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getProvenance(documentId).then(setProv).catch(() => setFailed(true));
  }, [documentId]);

  if (failed) return null;

  const intact = prov?.ledger_integrity.intact ?? true;
  const shortHash = prov ? `${prov.document_sha256.slice(0, 16)}…${prov.document_sha256.slice(-8)}` : "";

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-600 font-semibold mb-4">
        <Fingerprint className="w-3.5 h-3.5" /> Verification Fingerprint &amp; Provenance
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted mb-1">Document SHA-256</div>
          <div className="font-mono text-sm text-brand-900 break-all bg-brand-50 border border-brand-100 rounded px-2 py-1">
            {shortHash || "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Tamper-evident ledger</div>
          <div className={`inline-flex items-center gap-2 text-sm font-semibold rounded-full px-3 py-1 ${
            intact ? "bg-risk-low/10 text-risk-low" : "bg-risk-high/10 text-risk-high"
          }`}>
            {intact ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {intact ? "Chain intact" : "Chain broken"}
            <span className="text-muted font-normal">· {prov?.ledger_integrity.entries ?? 0} entries</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed mt-4 border-t border-border pt-3">
        {prov?.provenance.registered
          ? `This document's fingerprint is registered in the local provenance ledger (first seen ${prov.provenance.first_seen ?? "—"}). Re-uploading the same content produces the same hash; any change to the bytes produces a different hash.`
          : "This document's fingerprint has been recorded in an append-only, hash-chained local ledger. Only the SHA-256 hash and a non-identifying analysis summary are stored — never the document content."}
      </p>
    </div>
  );
}
