import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";

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
        className={`glass rounded-2xl border-2 border-dashed p-14 text-center cursor-pointer transition-all ${
          dragOver ? "border-accent bg-accent/10 shadow-lg shadow-accent/20 scale-[1.01]" : "border-white/10 hover:border-white/25"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED.join(",")}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) accept(f); }}
        />
        {!selected ? (
          <>
            <UploadCloud className="w-10 h-10 text-accent mx-auto mb-4" />
            <div className="font-medium mb-1">Drag & drop a document here</div>
            <div className="text-sm text-white/40">or click to browse &middot; PDF, PNG, JPG</div>
          </>
        ) : (
          <div className="flex items-center justify-between glass rounded-lg px-4 py-3 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-accent shrink-0" />
              <div className="min-w-0">
                <div className="truncate font-medium">{selected.name}</div>
                <div className="text-xs text-white/40">{(selected.size / 1024).toFixed(0)} KB</div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelected(null); }}
              className="text-white/40 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {selected && (
        <button
          onClick={() => onFile(selected)}
          className="w-full mt-4 rounded-lg bg-accent px-6 py-3 font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110"
        >
          Run Forensic Analysis
        </button>
      )}
    </div>
  );
}
