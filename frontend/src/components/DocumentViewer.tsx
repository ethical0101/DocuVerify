import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Region } from "../api/client";

function riskColor(score?: number): string {
  const s = score ?? 0.5;
  if (s >= 0.6) return "#f87171";
  if (s >= 0.35) return "#fbbf24";
  return "#facc15";
}

interface Anchor {
  left: number; top: number; width: number; height: number;
}

export default function DocumentViewer({
  imageUrl, pageSize, regions,
}: { imageUrl: string; pageSize: [number, number]; regions: Region[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [naturalSize, setNaturalSize] = useState<[number, number] | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [pw, ph] = naturalSize ?? pageSize;
  const selected = selectedIdx !== null ? regions[selectedIdx] : null;

  function recomputeAnchor(idx: number) {
    const outer = outerRef.current;
    const wrapper = wrapperRef.current;
    if (!outer || !wrapper || !pw || !ph) return;
    const outerRect = outer.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const scaleX = wrapperRect.width / pw;
    const scaleY = wrapperRect.height / ph;
    const [x, y, w, h] = regions[idx].bbox;
    setAnchor({
      left: wrapperRect.left - outerRect.left + x * scaleX,
      top: wrapperRect.top - outerRect.top + y * scaleY,
      width: w * scaleX,
      height: h * scaleY,
    });
  }

  function toggleRegion(idx: number) {
    if (selectedIdx === idx) {
      setSelectedIdx(null);
      setAnchor(null);
      return;
    }
    setSelectedIdx(idx);
    recomputeAnchor(idx);
  }

  useEffect(() => {
    if (selectedIdx === null) return;
    const onResize = () => recomputeAnchor(selectedIdx);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx, pw, ph]);

  // Popover placement: below the box by default, flipped above if it would run off
  // the bottom, and clamped horizontally so it never spills outside the viewer.
  const POPOVER_WIDTH = 260;
  let popoverLeft = 0, popoverTop = 0, flipAbove = false;
  if (anchor && outerRef.current) {
    const outerW = outerRef.current.clientWidth;
    const outerH = outerRef.current.clientHeight;
    popoverLeft = Math.min(Math.max(anchor.left, 8), Math.max(8, outerW - POPOVER_WIDTH - 8));
    flipAbove = anchor.top + anchor.height + 160 > outerH;
    popoverTop = flipAbove ? Math.max(8, anchor.top - 8) : anchor.top + anchor.height + 8;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div ref={outerRef} className="relative card p-2 flex-1 max-h-[600px] flex items-center justify-center">
        <div ref={wrapperRef} className="relative rounded-lg overflow-hidden" style={{ width: "100%" }}>
          <img
            src={imageUrl}
            alt="document"
            className="w-full h-auto block"
            onLoad={(e) => {
              const img = e.currentTarget;
              setNaturalSize([img.naturalWidth, img.naturalHeight]);
            }}
          />
          <svg
            viewBox={`0 0 ${pw || 1} ${ph || 1}`}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            {regions.map((r, i) => {
              const [x, y, w, h] = r.bbox;
              const color = riskColor(r.score);
              const isSelected = selectedIdx === i;
              return (
                <rect
                  key={i}
                  x={x} y={y} width={w} height={h}
                  fill={isSelected ? `${color}40` : `${color}1a`}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 1.5}
                  className="cursor-pointer transition-all"
                  onClick={() => toggleRegion(i)}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        </div>

        {selected && anchor && (
          <div
            className="absolute z-10 bg-panel rounded-lg p-3.5 shadow-xl border border-border"
            style={{ left: popoverLeft, top: popoverTop, width: POPOVER_WIDTH }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="font-semibold capitalize text-sm text-brand-900">{selected.type.replaceAll("_", " ")}</span>
              <button onClick={() => toggleRegion(selectedIdx!)} className="text-muted hover:text-ink shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {selected.score !== undefined && (
              <div className="text-xs font-mono mb-2 font-medium" style={{ color: riskColor(selected.score) }}>
                {(selected.score * 100).toFixed(0)}% confidence
              </div>
            )}
            {selected.text && (
              <div className="text-ink text-xs mb-2 font-mono bg-brand-50 border border-brand-100 rounded px-2 py-1 inline-block">
                "{selected.text}"
              </div>
            )}
            {selected.reason && (
              <p className="text-muted text-xs leading-relaxed">{selected.reason}</p>
            )}
          </div>
        )}
      </div>

      <div className="w-full lg:w-80 card p-4 max-h-[600px] overflow-y-auto scrollbar-thin">
        <div className="text-xs uppercase tracking-wide text-brand-600 font-semibold mb-3">
          Suspicious Regions ({regions.length})
        </div>
        {regions.length === 0 && (
          <div className="text-sm text-muted">No regions flagged above threshold.</div>
        )}
        <div className="space-y-2">
          {regions.map((r, i) => {
            const color = riskColor(r.score);
            return (
              <button
                key={i}
                onClick={() => toggleRegion(i)}
                className={`w-full text-left rounded-lg p-3 text-sm transition border ${
                  selectedIdx === i ? "border-brand-300 bg-brand-50" : "border-border hover:bg-brand-50/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold capitalize text-brand-900">{r.type.replaceAll("_", " ")}</span>
                  {r.score !== undefined && (
                    <span className="text-xs font-mono font-medium" style={{ color }}>
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                {r.text && <div className="text-muted text-xs mb-1 font-mono">"{r.text}"</div>}
                {selectedIdx === i && r.reason && (
                  <div className="text-muted text-xs leading-relaxed mt-1">{r.reason}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
