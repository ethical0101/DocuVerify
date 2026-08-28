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
    <div className="max-w-2xl mx-auto w-full">
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
        className={`rounded-xl border-2 border-dashed p-14 text-center cursor-pointer transition ${
          dragOver ? "border-brand-500 bg-brand-50" : "border-brand-200 bg-panel hover:border-brand-400 hover:bg-brand-50/50"
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
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-7 h-7 text-brand-600" />
            </div>
            <div className="font-semibold text-brand-900 mb-1">Drag &amp; drop a document here</div>
            <div className="text-sm text-muted">or click to browse &middot; PDF, PNG, JPG</div>
          </>
        ) : (
          <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-brand-600 shrink-0" />
              <div className="min-w-0">
                <div className="truncate font-medium text-brand-900">{selected.name}</div>
                <div className="text-xs text-muted">{(selected.size / 1024).toFixed(0)} KB</div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelected(null); }}
              className="text-muted hover:text-ink shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {selected && (
        <button
          onClick={() => onFile(selected)}
          className="w-full mt-4 rounded-md bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          Run Forensic Analysis
        </button>
      )}
    </div>
  );
}
