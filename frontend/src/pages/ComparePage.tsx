import { useEffect, useMemo, useState } from "react";
import { getResults, listInvestigations, documentImageUrl, type InvestigationSummary, type ResultsResponse } from "../api/client";
import DocumentViewer from "../components/DocumentViewer";

/** Matches OCR words between two documents by normalized (x/width, y/height) position
 * proximity -- a lightweight, honest heuristic (not a real document-template diff engine).
 * Good enough to surface "this field's text differs" for documents sharing a layout;
 * documents with different layouts will simply show few/no matched pairs. */
function diffWords(a: ResultsResponse, b: ResultsResponse) {
  const [aw, ah] = a.page_size, [bw, bh] = b.page_size;
  const pairs: { left: string; right: string }[] = [];
  const usedB = new Set<number>();
  for (const wa of a.ocr_words) {
    const nx = (wa.bbox[0] + wa.bbox[2] / 2) / aw, ny = (wa.bbox[1] + wa.bbox[3] / 2) / ah;
    let best = -1, bestDist = 0.04;
    b.ocr_words.forEach((wb, j) => {
      if (usedB.has(j)) return;
      const mx = (wb.bbox[0] + wb.bbox[2] / 2) / bw, my = (wb.bbox[1] + wb.bbox[3] / 2) / bh;
      const dist = Math.hypot(nx - mx, ny - my);
      if (dist < bestDist) { bestDist = dist; best = j; }
    });
    if (best >= 0) {
      usedB.add(best);
      if (wa.text.trim() !== b.ocr_words[best].text.trim()) {
        pairs.push({ left: wa.text, right: b.ocr_words[best].text });
      }
    }
  }
  return pairs;
}

export default function ComparePage() {
  const [items, setItems] = useState<InvestigationSummary[]>([]);
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [left, setLeft] = useState<ResultsResponse | null>(null);
  const [right, setRight] = useState<ResultsResponse | null>(null);

  useEffect(() => { listInvestigations().then(setItems).catch(() => {}); }, []);
  useEffect(() => { if (leftId) getResults(leftId).then(setLeft).catch(() => setLeft(null)); }, [leftId]);
  useEffect(() => { if (rightId) getResults(rightId).then(setRight).catch(() => setRight(null)); }, [rightId]);

  const diffs = useMemo(() => (left && right ? diffWords(left, right) : []), [left, right]);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Compare Documents</h1>
      <p className="text-white/50 text-sm mb-6">
        Select a reference document and a suspected document to compare side by side.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Picker label="Reference Document" items={items} value={leftId} onChange={setLeftId} />
        <Picker label="Suspected Document" items={items} value={rightId} onChange={setRightId} />
      </div>

      {left && right ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <DocumentViewer imageUrl={documentImageUrl(leftId)} pageSize={left.page_size} evidenceList={[]} />
            <DocumentViewer imageUrl={documentImageUrl(rightId)} pageSize={right.page_size} evidenceList={right.evidence_list} />
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wide text-white/40 mb-4">
              {diffs.length} Difference{diffs.length === 1 ? "" : "s"} Detected
            </div>
            {diffs.length === 0 ? (
              <div className="text-sm text-white/40">No differing text pairs found at matching positions.</div>
            ) : (
              <div className="space-y-2">
                {diffs.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-white/5 rounded-lg px-4 py-2.5">
                    <span className="font-mono text-white/70">{d.left}</span>
                    <span className="text-white/30">vs</span>
                    <span className="font-mono text-risk-high">{d.right}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-white/30 mt-4">
              Differences are detected by matching OCR text at similar positions between the two
              documents -- a positional heuristic, not a verified field-level template match.
            </p>
          </div>
        </>
      ) : (
        <div className="glass rounded-xl p-10 text-center text-white/40 text-sm">
          Select two investigations above to compare them.
        </div>
      )}
    </div>
  );
}

function Picker({ label, items, value, onChange }: {
  label: string; items: InvestigationSummary[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-white/40 mb-2">{label}</div>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border border-white/15 rounded-lg px-3 py-2 text-sm outline-none"
      >
        <option value="" className="bg-ink-900">Select a document...</option>
        {items.map((item) => (
          <option key={item.id} value={item.id} className="bg-ink-900">
            {item.filename} ({item.case_number})
          </option>
        ))}
      </select>
    </div>
  );
}
