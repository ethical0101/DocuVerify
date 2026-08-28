import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Scale, ShieldAlert, FileText, ChevronRight } from "lucide-react";
import { getResults, listInvestigations, documentImageUrl, type InvestigationSummary, type ResultsResponse } from "../api/client";
import DocumentViewer from "../components/DocumentViewer";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

/** Matches OCR words between two documents by normalized (x/width, y/height) position
 * proximity -- a lightweight, honest heuristic.
 * Good enough to surface "this field's text differs" for documents sharing a layout. */
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

  useEffect(() => { 
    listInvestigations().then(setItems).catch(() => {}); 
  }, []);
  
  useEffect(() => { 
    if (leftId) getResults(leftId).then(setLeft).catch(() => setLeft(null)); 
  }, [leftId]);
  
  useEffect(() => { 
    if (rightId) getResults(rightId).then(setRight).catch(() => setRight(null)); 
  }, [rightId]);

  const diffs = useMemo(() => (left && right ? diffWords(left, right) : []), [left, right]);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 relative"
    >
      {/* Title */}
      <motion.div variants={itemVariants} className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5" /> COMPARATIVE ANALYSIS WORKSPACE
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Compare Documents</h1>
        <p className="text-white/50 text-sm mt-1">
          Select a verified reference template and a suspected document to cross-examine layout and text discrepancies.
        </p>
      </motion.div>

      {/* Select Pickers */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Picker label="Verified Reference Template" items={items} value={leftId} onChange={setLeftId} />
        <Picker label="Suspected Target Document" items={items} value={rightId} onChange={setRightId} />
      </motion.div>

      {left && right ? (
        <div className="space-y-6">
          {/* Side-by-Side Viewers */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-wider">REFERENCE DOSSIER MAP</div>
              <DocumentViewer imageUrl={documentImageUrl(leftId)} pageSize={left.page_size} evidenceList={[]} />
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-wider">SUSPECTED ANOMALIES MAP</div>
              <DocumentViewer imageUrl={documentImageUrl(rightId)} pageSize={right.page_size} evidenceList={right.evidence_list} />
            </div>
          </motion.div>

          {/* Positional OCR Diff List */}
          <motion.div variants={itemVariants} className="glass gradient-border rounded-xl p-5 border border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-risk-high/15 border border-risk-high/30 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-risk-high" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest">POSITIONAL OCR ANALYSIS</div>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {diffs.length} Text Mismatch{diffs.length === 1 ? "" : "es"} Flagged
                </h3>
              </div>
            </div>

            {diffs.length === 0 ? (
              <div className="text-xs text-white/40 font-mono py-4">No text field mismatches detected at overlapping grid points.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                {diffs.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs bg-white/[0.01] border border-border rounded-lg px-3 py-2.5 font-mono">
                    <div className="min-w-0">
                      <div className="text-white/40 text-[9px] uppercase mb-0.5">Template value</div>
                      <div className="truncate text-white/80 font-semibold">{d.left}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                    <div className="min-w-0 text-right">
                      <div className="text-risk-high text-[9px] uppercase mb-0.5">Detected value</div>
                      <div className="truncate text-risk-high font-bold">{d.right}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border/40 text-[10px] text-white/30 font-mono uppercase leading-normal">
              OCR difference lists evaluate characters situated at similar coordinates. Slight alignment variance may shift results.
            </div>
          </motion.div>
        </div>
      ) : (
        <motion.div variants={itemVariants} className="glass gradient-border rounded-xl p-12 text-center text-white/45 text-sm border border-border/60 bg-white/[0.01]">
          <FileText className="w-8 h-8 text-white/25 mx-auto mb-3" />
          <div className="font-semibold text-white/80">Select investigations to initiate compare</div>
          <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto">Choose a verified reference file and a suspect file from the dropdown boxes above.</p>
        </motion.div>
      )}
    </motion.div>
  );
}

function Picker({ label, items, value, onChange }: {
  label: string; items: InvestigationSummary[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="glass gradient-border rounded-xl p-4 border border-border/60 bg-white/[0.01]">
      <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest mb-2.5">{label}</div>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 border border-border rounded-lg px-3 py-2.5 text-xs text-white/80 outline-none focus:border-accent/60 transition-colors"
      >
        <option value="" className="bg-panel">Choose case document...</option>
        {items.map((item) => (
          <option key={item.id} value={item.id} className="bg-panel">
            {item.filename} ({item.case_number})
          </option>
        ))}
      </select>
    </div>
  );
}
