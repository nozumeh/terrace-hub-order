// Patrón de circuito + semigrid animado. Decorativo, no interactivo.
export function CircuitGrid({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Grid base */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--gold) 35%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--gold) 35%, transparent) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      {/* Trazos de circuito SVG */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="cg-stroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--gold) 0%, transparent)" />
            <stop offset="50%" stopColor="color-mix(in oklab, var(--gold) 75%, transparent)" />
            <stop offset="100%" stopColor="color-mix(in oklab, var(--gold) 0%, transparent)" />
          </linearGradient>
        </defs>

        {/* Trazos estáticos sutiles */}
        <g
          stroke="color-mix(in oklab, var(--gold) 22%, transparent)"
          strokeWidth="1"
          fill="none"
        >
          <path d="M0 120 H260 L300 160 H520 L560 200 H900 L940 240 H1200" />
          <path d="M0 420 H180 L220 380 H440 L480 340 H760 L800 380 H1080 L1120 420 H1200" />
          <path d="M120 0 V100 L160 140 V300 L120 340 V600" />
          <path d="M1040 0 V160 L1080 200 V420 L1040 460 V600" />
        </g>

        {/* Nodos */}
        <g fill="color-mix(in oklab, var(--gold) 55%, transparent)">
          {[
            [260, 120], [520, 160], [900, 200], [1200, 240],
            [220, 380], [480, 340], [800, 380], [1120, 420],
            [120, 100], [160, 300], [1040, 160], [1080, 420],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />
          ))}
        </g>

        {/* Pulsos animados sobre los trazos principales */}
        <g>
          <path
            id="cg-path-1"
            d="M0 120 H260 L300 160 H520 L560 200 H900 L940 240 H1200"
            stroke="url(#cg-stroke)"
            strokeWidth="1.5"
            strokeDasharray="120 1080"
            className="cg-dash"
            style={{ animationDuration: "9s" }}
          />
          <path
            id="cg-path-2"
            d="M0 420 H180 L220 380 H440 L480 340 H760 L800 380 H1080 L1120 420 H1200"
            stroke="url(#cg-stroke)"
            strokeWidth="1.5"
            strokeDasharray="160 1280"
            className="cg-dash"
            style={{ animationDuration: "12s", animationDelay: "1.5s" }}
          />
          <path
            d="M120 0 V100 L160 140 V300 L120 340 V600"
            stroke="url(#cg-stroke)"
            strokeWidth="1.5"
            strokeDasharray="100 700"
            className="cg-dash"
            style={{ animationDuration: "8s", animationDelay: "0.8s" }}
          />
          <path
            d="M1040 0 V160 L1080 200 V420 L1040 460 V600"
            stroke="url(#cg-stroke)"
            strokeWidth="1.5"
            strokeDasharray="100 700"
            className="cg-dash"
            style={{ animationDuration: "10s", animationDelay: "2.2s" }}
          />
        </g>
      </svg>
    </div>
  );
}
