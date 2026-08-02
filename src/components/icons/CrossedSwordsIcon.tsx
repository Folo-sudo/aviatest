'use client';

/** Two crossed swords: blue vs red. */
export function CrossedSwordsIcon({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Blue sword (back-left to front-right) */}
      <g transform="rotate(-40 32 32)">
        <rect x="29" y="8" width="6" height="34" rx="1.5" fill="#2563eb" />
        <path d="M32 4 L36 10 H28 Z" fill="#1d4ed8" />
        <rect x="24" y="40" width="16" height="4" rx="1" fill="#1e3a8a" />
        <rect x="30" y="44" width="4" height="12" rx="1" fill="#64748b" />
      </g>
      {/* Red sword (back-right to front-left) */}
      <g transform="rotate(40 32 32)">
        <rect x="29" y="8" width="6" height="34" rx="1.5" fill="#dc2626" />
        <path d="M32 4 L36 10 H28 Z" fill="#b91c1c" />
        <rect x="24" y="40" width="16" height="4" rx="1" fill="#7f1d1d" />
        <rect x="30" y="44" width="4" height="12" rx="1" fill="#64748b" />
      </g>
    </svg>
  );
}
