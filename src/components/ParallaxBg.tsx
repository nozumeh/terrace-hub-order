import { useEffect, useRef, type ReactNode } from "react";
import { CircuitGrid } from "./CircuitGrid";

interface Props {
  children: ReactNode;
  /** Tailwind alignment for the word wrapper (defaults to bottom on mobile, center on md+) */
  wrapperClass?: string;
  /** Movement intensity multiplier (default 1) */
  intensity?: number;
}

/**
 * Sutil parallax sobre el patrón de circuito y la palabra grande de fondo.
 * Reacciona a scroll y movimiento del mouse, respeta prefers-reduced-motion.
 */
export function ParallaxBg({ children, wrapperClass = "items-end justify-center md:items-center", intensity = 1 }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let mx = 0, my = 0; // mouse, -1..1
    let tmx = 0, tmy = 0; // smoothed

    const tick = () => {
      raf = 0;
      const root = rootRef.current;
      if (!root) return;
      // smooth mouse
      tmx += (mx - tmx) * 0.08;
      tmy += (my - tmy) * 0.08;

      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // progress: -1 (section below viewport) → 1 (section above)
      const p = Math.max(-1, Math.min(1, ((vh / 2) - (rect.top + rect.height / 2)) / vh));

      if (wordRef.current) {
        const ty = (p * 28 + tmy * 6) * intensity;
        const tx = (tmx * 10) * intensity;
        wordRef.current.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
      }
      if (gridRef.current) {
        const ty = (p * -14 + tmy * -4) * intensity;
        const tx = (tmx * -6) * intensity;
        gridRef.current.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
      }

      // continue animating while mouse easing not settled
      if (Math.abs(tmx - mx) > 0.001 || Math.abs(tmy - my) > 0.001) schedule();
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const onScroll = () => schedule();
    const onMouse = (e: MouseEvent) => {
      mx = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
      my = (e.clientY / (window.innerHeight || 1)) * 2 - 1;
      schedule();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("resize", onScroll);
    schedule();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [intensity]);

  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div ref={gridRef} className="absolute inset-0 will-change-transform">
        <CircuitGrid />
      </div>
      <div className={`absolute inset-0 flex select-none overflow-hidden ${wrapperClass}`}>
        <div ref={wordRef} className="will-change-transform">
          {children}
        </div>
      </div>
    </div>
  );
}
