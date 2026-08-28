import { useEffect, useState } from "react";
import type { RiskLevel } from "../api/client";

const RISK_COLOR: Record<RiskLevel, string> = { 
  LOW: "#10b981", 
  MEDIUM: "#f59e0b", 
  HIGH: "#ef4444" 
};

export default function ScoreCard({
  authenticity, risk, riskLevel, confidence,
}: { authenticity: number; risk: number; riskLevel: RiskLevel; confidence: number }) {
  const riskColor = RISK_COLOR[riskLevel] ?? "#8b93ab";

  return (
    <div className="glass gradient-border rounded-2xl p-6 border border-border/60 bg-gradient-to-b from-white/[0.01] to-transparent grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
      {/* Metric 1: Authenticity Score */}
      <div className="flex flex-col items-center">
        <RadialGauge 
          value={authenticity} 
          color="#3b82f6" 
          label="Authenticity"
          subLabel="Integrity Rating"
        />
      </div>

      {/* Metric 2: Forensic Risk */}
      <div className="flex flex-col items-center sm:border-x sm:border-border/40 sm:px-6">
        <RadialGauge 
          value={risk} 
          color={riskColor} 
          label="Forensic Risk"
          subLabel={`${riskLevel} RISK LEVEL`}
          valueSuffix=""
        />
      </div>

      {/* Metric 3: Assessment Confidence */}
      <div className="flex flex-col items-center">
        <RadialGauge
          value={confidence}
          color="#14b8a6"
          label="Confidence"
          subLabel={confidence < 60 ? "UNSTABLE QUALITY" : "HIGH FIDELITY"}
        />
      </div>
    </div>
  );
}

function RadialGauge({ 
  value, color, label, subLabel, valueSuffix = "%" 
}: { 
  value: number; color: string; label: string; subLabel: string; valueSuffix?: string 
}) {
  const size = 96;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const [displayValue, setDisplayValue] = useState(0);
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    const duration = 1200; // 1.2 seconds animation
    const startTime = performance.now();
    let animFrame: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic curve
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentVal = ease * value;
      
      setDisplayValue(currentVal);
      setAnimatedOffset(circumference - (Math.min(100, Math.max(0, currentVal)) / 100) * circumference);

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [value, circumference]);

  return (
    <div className="flex flex-col items-center text-center space-y-3">
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG Circle Track and Active Progress */}
        <svg className="w-full h-full transform -rotate-90">
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            fill="transparent" 
            stroke="rgba(255,255,255,0.03)" 
            strokeWidth={strokeWidth} 
          />
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            fill="transparent" 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={circumference} 
            strokeDashoffset={animatedOffset} 
            strokeLinecap="round" 
            style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
          />
        </svg>
        {/* Centered Score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline justify-center">
            <span className="text-2xl font-black text-white font-mono tracking-tighter">
              {Math.round(displayValue)}
            </span>
            {valueSuffix && (
              <span className="text-[11px] text-white/40 font-semibold font-mono ml-0.5">
                {valueSuffix}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 font-mono">{label}</div>
        <div className="text-[9px] font-bold font-mono tracking-wide" style={{ color }}>{subLabel}</div>
      </div>
    </div>
  );
}
