import { useState } from "react";
import type { Region } from "../api/client";

function riskColor(score?: number): string {
  const s = score ?? 0.5;
  if (s >= 0.6) return "#f87171";
  if (s >= 0.35) return "#fbbf24";
  return "#facc15";
}

export default function DocumentViewer({
  imageUrl, pageSize, regions,
}: { imageUrl: string; pageSize: [number, number]; regions: Region[] }) {
  const [selected, setSelected] = useState<Region | null>(null);
  const [naturalSize, setNaturalSize] = useState<[number, number] | null>(null);

  const [pw, ph] = naturalSize ?? pageSize;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="relative glass rounded-xl overflow-hidden flex-1 max-h-[600px] flex items-center justify-center">
        <div className="relative" style={{ width: "100%" }}>
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
              const isSelected = selected === r;
              return (
                <rect
                  key={i}
                  x={x} y={y} width={w} height={h}
                  fill={isSelected ? `${color}33` : `${color}14`}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 1.5}
                  className="cursor-pointer transition-all"
                  onClick={() => setSelected(r)}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        </div>
      </div>

      <div className="w-full lg:w-80 glass rounded-xl p-4 max-h-[600px] overflow-y-auto scrollbar-thin">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3">
          Suspicious Regions ({regions.length})
        </div>
        {regions.length === 0 && (
          <div className="text-sm text-white/40">No regions flagged above threshold.</div>
        )}
        <div className="space-y-2">
          {regions.map((r, i) => {
            const color = riskColor(r.score);
            return (
              <button
                key={i}
                onClick={() => setSelected(r)}
                className={`w-full text-left rounded-lg p-3 text-sm transition border ${
                  selected === r ? "border-white/30 bg-white/5" : "border-transparent hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium capitalize">{r.type.replaceAll("_", " ")}</span>
                  {r.score !== undefined && (
                    <span className="text-xs font-mono" style={{ color }}>
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                {r.text && <div className="text-white/50 text-xs mb-1 font-mono">"{r.text}"</div>}
                {r.reason && <div className="text-white/50 text-xs leading-relaxed">{r.reason}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
