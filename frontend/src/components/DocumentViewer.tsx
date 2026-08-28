import { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { Evidence } from "../api/client";
import EvidenceDrawer from "./EvidenceDrawer";

function severityColor(severity?: string): string {
  switch (severity) {
    case "critical":
    case "high": return "#f87171";
    case "medium": return "#fbbf24";
    case "low": return "#facc15";
    default: return "#8b93ab";
  }
}

export default function DocumentViewer({
  imageUrl, pageSize, evidenceList, selectedIndex, onSelectIndex,
}: {
  imageUrl: string; pageSize: [number, number]; evidenceList: Evidence[];
  selectedIndex?: number | null; onSelectIndex?: (idx: number | null) => void;
}) {
  const [internalIdx, setInternalIdx] = useState<number | null>(null);
  const controlled = selectedIndex !== undefined;
  const selectedIdx = controlled ? selectedIndex : internalIdx;
  const setSelectedIdx = controlled ? (onSelectIndex as (i: number | null) => void) : setInternalIdx;
  const [naturalSize, setNaturalSize] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(1);

  const [pw, ph] = naturalSize ?? pageSize;
  const boxable = evidenceList.filter((e) => e.bbox);
  const selected = selectedIdx !== null ? boxable[selectedIdx] : null;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <span className="text-xs uppercase tracking-wide text-white/40">Document Evidence Map</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                  className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-white/40 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom(1)} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative max-h-[640px] overflow-auto scrollbar-thin bg-black/20">
        <div className="relative" style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
          <img
            src={imageUrl}
            alt="document"
            className="w-full h-auto block select-none"
            draggable={false}
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
            {boxable.map((e, i) => {
              const [x, y, w, h] = e.bbox!;
              const color = severityColor(e.severity);
              const isSelected = selectedIdx === i;
              return (
                <g key={e.id}>
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={isSelected ? `${color}40` : `${color}1a`}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="cursor-pointer transition-all"
                    onClick={() => setSelectedIdx(i)}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <EvidenceDrawer
        evidence={selected}
        index={selectedIdx ?? undefined}
        total={boxable.length}
        onClose={() => setSelectedIdx(null)}
        onPrev={selectedIdx && selectedIdx > 0 ? () => setSelectedIdx(selectedIdx - 1) : undefined}
        onNext={selectedIdx !== null && selectedIdx < boxable.length - 1 ? () => setSelectedIdx(selectedIdx + 1) : undefined}
      />
    </div>
  );
}
