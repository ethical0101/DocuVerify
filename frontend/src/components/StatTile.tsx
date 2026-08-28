import { useCountUp } from "../hooks/useCountUp";

export default function StatTile({
  label, value, color, icon: Icon,
}: { label: string; value: number; color: string; icon: any }) {
  const displayValue = useCountUp(value);

  return (
    <div className="glass glass-elevate rounded-xl p-5 border border-white/[0.08] relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
      {/* Background radial soft light orb */}
      <div
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none transition-opacity group-hover:opacity-25"
        style={{ backgroundColor: color }}
      />
      {/* Vertical indicator status bar on the left */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />

      <div className="flex items-center justify-between pl-1">
        <span className="text-[10px] font-bold text-white/65 uppercase tracking-widest font-mono">{label}</span>
        <Icon className="w-4 h-4 text-white/50 group-hover:scale-105 transition-transform" style={{ color }} />
      </div>

      <div
        className="text-3.5xl font-black mt-3 font-mono tracking-tight pl-1"
        style={{
          color: color,
          textShadow: `0 0 15px ${color}50`
        }}
      >
        {Math.round(displayValue)}
      </div>
    </div>
  );
}
