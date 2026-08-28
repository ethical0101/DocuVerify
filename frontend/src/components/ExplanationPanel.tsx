import { MessageSquareText, ListChecks, AlertTriangle } from "lucide-react";
import type { ResultsResponse } from "../api/client";

export default function ExplanationPanel({ explanation, forgeryTypes }: {
  explanation: ResultsResponse["explanation"];
  forgeryTypes: string[];
}) {
  return (
    <div className="card p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-600 font-semibold mb-2">
          <MessageSquareText className="w-3.5 h-3.5" /> Why was this document flagged?
        </div>
        <p className="text-sm text-ink leading-relaxed">{explanation.summary}</p>
      </div>

      {forgeryTypes.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-brand-600 font-semibold mb-2">Likely Manipulation Type(s)</div>
          <div className="flex flex-wrap gap-2">
            {forgeryTypes.map((t) => (
              <span key={t} className="text-xs rounded-full bg-risk-high/10 text-risk-high border border-risk-high/20 px-3 py-1 capitalize font-medium">
                {t.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {explanation.recommended_checks?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-600 font-semibold mb-2">
            <ListChecks className="w-3.5 h-3.5" /> Recommended Human Checks
          </div>
          <ul className="space-y-1.5">
            {explanation.recommended_checks.map((c) => (
              <li key={c} className="text-sm text-ink flex items-start gap-2">
                <span className="text-brand-500 mt-1">&bull;</span> {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-muted border-t border-border pt-4">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-saffron" />
        <span>{explanation.limitations}</span>
      </div>
    </div>
  );
}
