import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, ImageOff, Move, Maximize2 } from "lucide-react";
import type { Evidence } from "../api/client";
import EvidenceDrawer from "./EvidenceDrawer";
import { useAuthedImage } from "../hooks/useAuthedImage";

function severityColor(severity?: string): string {
  switch (severity) {
    case "critical":
    case "high": return "#ef4444"; // red
    case "medium": return "#f59e0b"; // amber
    case "low": return "#10b981"; // green
    default: return "#3b82f6"; // blue
  }
}

export default function DocumentViewer({
  imageUrl, pageSize, evidenceList, selectedIndex, onSelectIndex, scanKey,
}: {
  imageUrl: string; pageSize: [number, number]; evidenceList: Evidence[];
  selectedIndex?: number | null; onSelectIndex?: (idx: number | null) => void;
  /** Changing this re-triggers the one-shot scan sweep -- pass the active
   * pipeline stage (or similar) so re-selecting a finding doesn't replay it. */
  scanKey?: string;
}) {
  const [internalIdx, setInternalIdx] = useState<number | null>(null);
  const controlled = selectedIndex !== undefined;
  const selectedIdx = controlled ? selectedIndex : internalIdx;
  const setSelectedIdx = controlled ? (onSelectIndex as (i: number | null) => void) : setInternalIdx;
  const [naturalSize, setNaturalSize] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const blobUrl = useAuthedImage(imageUrl);

  const [pw, ph] = naturalSize ?? pageSize;
  const boxable = evidenceList.filter((e) => e.bbox);
  const selected = selectedIdx !== null ? boxable[selectedIdx] : null;

  // Reset pan when zoom changes to 1 (fit to screen)
  useEffect(() => {
    if (zoom === 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="glass rounded-xl overflow-hidden border border-border/60 bg-white/[0.01]">
      {/* Dynamic Header toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-black/30">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">
          EVIDENCE ANOMALY MAP
        </span>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            title="Zoom Out"
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4.5 h-4.5" />
          </button>
          <span className="text-[11px] text-white/50 w-12 text-center font-mono select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            title="Zoom In"
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4.5 h-4.5" />
          </button>
          <div className="w-px h-4 bg-border/60 mx-1" />
          <button 
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            title="Fit to Screen"
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main image viewer workspace */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`relative max-h-[580px] overflow-hidden bg-black/45 select-none ${
          zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
        }`}
      >
        <div
          className="relative transition-transform duration-100 ease-out origin-center"
          style={{
            width: `${zoom * 100}%`,
            minWidth: "100%",
            transform: `translate(${pan.x}px, ${pan.y}px)`
          }}
        >
          {/* One-shot scan sweep -- replays whenever scanKey (or the image
              itself) changes, cueing "this stage is now examining the document" */}
          <div key={`${scanKey ?? ""}-${blobUrl ?? ""}`} className="scan-sweep-once" />
          {blobUrl ? (
            <img
              src={blobUrl}
              alt="forensic target"
              className="w-full h-auto block select-none pointer-events-none"
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalSize([img.naturalWidth, img.naturalHeight]);
              }}
            />
          ) : (
            <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-2 text-white/30 py-24">
              <ImageOff className="w-7 h-7 text-white/20 animate-pulse" />
              <span className="text-xs font-mono tracking-widest text-white/40">LOADING RESOLUTION LAYER...</span>
            </div>
          )}
          
          <svg
            viewBox={`0 0 ${pw || 1} ${ph || 1}`}
            className="absolute inset-0 w-full h-full pointer-events-auto"
            preserveAspectRatio="none"
          >
            {boxable.map((e, i) => {
              const [x, y, w, h] = e.bbox!;
              const color = severityColor(e.severity);
              const isSelected = selectedIdx === i;
              
              return (
                <g key={e.id}>
                  {/* Glowing background anchor for active selected bounding box */}
                  {isSelected && (
                    <rect
                      x={x - 3} y={y - 3} width={w + 6} height={h + 6}
                      fill="none" 
                      stroke="#ffffff" 
                      strokeOpacity={0.7} 
                      strokeWidth={1.5} 
                      strokeDasharray="3 2"
                      rx={2} 
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  
                  {/* Anomaly trigger region rectangle */}
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={isSelected ? `${color}33` : `${color}0b`}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 1.25}
                    strokeOpacity={isSelected ? 1 : 0.65}
                    className={`cursor-pointer transition-all duration-200 hover:fill-[${color}40] ${
                      isSelected ? "" : "evidence-pulse"
                    }`}
                    style={{
                      filter: isSelected ? `drop-shadow(0 0 4px ${color})` : "none",
                      "--pulse-color": color
                    } as any}
                    onClick={() => setSelectedIdx(i)}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Small floating navigation helper message when zoomed in */}
        {zoom > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/75 border border-border/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] text-white/50 font-mono pointer-events-none select-none">
            <Move className="w-3.5 h-3.5 text-accent-bright animate-bounce" />
            <span>DRAG TO PAN</span>
          </div>
        )}
      </div>

      <EvidenceDrawer
        evidence={selected}
        index={selectedIdx ?? undefined}
        total={boxable.length}
        onClose={() => setSelectedIdx(null)}
        onPrev={selectedIdx !== null && selectedIdx > 0 ? () => setSelectedIdx(selectedIdx - 1) : undefined}
        onNext={selectedIdx !== null && selectedIdx < boxable.length - 1 ? () => setSelectedIdx(selectedIdx + 1) : undefined}
      />
    </div>
  );
}
