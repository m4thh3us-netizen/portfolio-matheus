/**
 * Static SVG rendition of the three glass rings (no WebGL, reduced motion, low-end).
 * Colors use `style` (not presentation attributes) so they resolve the tokens.css variables.
 */
export function RingsFallback() {
  return (
    <svg viewBox="0 0 600 600" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="rf-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: "var(--electric)" }} stopOpacity="0.22" />
          <stop offset="55%" style={{ stopColor: "var(--violet)" }} stopOpacity="0.08" />
          <stop offset="100%" style={{ stopColor: "var(--bg)" }} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rf-ice" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--text)" }} stopOpacity="0.95" />
          <stop offset="40%" style={{ stopColor: "var(--ice)" }} stopOpacity="0.55" />
          <stop offset="100%" style={{ stopColor: "var(--ice)" }} stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="rf-violet" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--violet)" }} stopOpacity="0.9" />
          <stop offset="60%" style={{ stopColor: "var(--ice)" }} stopOpacity="0.35" />
          <stop offset="100%" style={{ stopColor: "var(--violet)" }} stopOpacity="0.1" />
        </linearGradient>
        <filter id="rf-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <circle cx="300" cy="300" r="290" fill="url(#rf-halo)" />
      <g fill="none" strokeLinecap="round">
        {/* Soft glow underlay */}
        <g filter="url(#rf-soft)" opacity="0.6">
          <ellipse cx="300" cy="300" rx="190" ry="78" transform="rotate(-24 300 300)" style={{ stroke: "var(--electric)" }} strokeWidth="18" />
          <ellipse cx="320" cy="285" rx="150" ry="150" transform="rotate(0 320 285)" style={{ stroke: "var(--violet)" }} strokeWidth="10" opacity="0.4" />
        </g>
        {/* Ring A — wide, tilted */}
        <ellipse cx="300" cy="300" rx="190" ry="78" transform="rotate(-24 300 300)" stroke="url(#rf-ice)" strokeWidth="16" />
        <ellipse cx="300" cy="300" rx="190" ry="78" transform="rotate(-24 300 300)" style={{ stroke: "var(--text)" }} strokeOpacity="0.5" strokeWidth="1.5" />
        {/* Ring B — near-frontal, offset */}
        <ellipse cx="322" cy="282" rx="150" ry="140" transform="rotate(18 322 282)" stroke="url(#rf-violet)" strokeWidth="12" />
        <ellipse cx="322" cy="282" rx="150" ry="140" transform="rotate(18 322 282)" style={{ stroke: "var(--text)" }} strokeOpacity="0.35" strokeWidth="1" />
        {/* Ring C — small, steep */}
        <ellipse cx="270" cy="322" rx="62" ry="118" transform="rotate(38 270 322)" stroke="url(#rf-ice)" strokeWidth="10" />
        <ellipse cx="270" cy="322" rx="62" ry="118" transform="rotate(38 270 322)" style={{ stroke: "var(--text)" }} strokeOpacity="0.4" strokeWidth="1" />
      </g>
    </svg>
  );
}
