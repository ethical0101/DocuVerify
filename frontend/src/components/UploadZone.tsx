import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, ShieldCheck } from "lucide-react";

const ACCEPTED = [".pdf", ".png", ".jpg", ".jpeg"];

export default function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      alert(`Unsupported file type ${ext}. Allowed: ${ACCEPTED.join(", ")}`);
      return;
    }
    setSelected(file);
  }, []);

  return (
    <div className="max-w-2xl mx-auto w-full px-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) accept(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`glass rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
          dragOver 
            ? "border-accent bg-accent/5 shadow-lg shadow-accent/15 scale-[1.01]" 
            : "border-border/60 hover:border-accent/40 bg-white/[0.01] hover:bg-white/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED.join(",")}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) accept(f); }}
        />
        
        {/* Dynamic scan line on drag over */}
        {dragOver && <div className="scan-line" style={{ animationDuration: "1.8s" }} />}

        {!selected ? (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto shadow-md shadow-accent/5">
              <Upload className="w-5 h-5 text-accent-bright" />
            </div>
            <div>
              <div className="font-semibold text-white/90 text-base">Ingest Case Document</div>
              <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto leading-relaxed">
                Drag & drop document here or click to browse. Supports PDF, PNG, or JPG formats.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.02] border border-border px-3 py-1 text-[10px] text-white/45 font-mono">
              <span>MAX SIZE: 10MB</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white/[0.02] border border-border/80 rounded-xl px-4 py-3 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-accent-bright" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-white/90 text-sm">{selected.name}</div>
                <div className="text-[11px] text-white/40 font-mono mt-0.5">{(selected.size / 1024).toFixed(0)} KB</div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelected(null); }}
              className="text-white/40 hover:text-white shrink-0 p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {selected && (
        <button
          onClick={() => onFile(selected)}
          className="w-full mt-4 rounded-lg bg-accent hover:bg-accent-bright text-white py-3 font-semibold shadow-lg shadow-accent/20 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Initiate Forensic Analysis</span>
        </button>
      )}
    </div>
  );
}
