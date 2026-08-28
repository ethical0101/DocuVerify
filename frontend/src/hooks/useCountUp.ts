import { useEffect, useRef, useState } from "react";

/**
 * Animates a numeric display value from its previous value to `target`
 * using an ease-out curve. Respects prefers-reduced-motion by jumping
 * straight to the final value instead of animating.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplay(target);
      prevTarget.current = target;
      return;
    }

    const from = prevTarget.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(animate);
      } else {
        prevTarget.current = to;
      }
    };
    frame.current = requestAnimationFrame(animate);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return display;
}
