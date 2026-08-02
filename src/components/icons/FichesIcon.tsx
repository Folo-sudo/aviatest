import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/** Deux fiches en eventail — couleurs pastel. */
export function FichesIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 28 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      style={style}
      aria-hidden
    >
      {/* Fiche arriere — lilas pastel, legerement tournee a gauche */}
      <g transform="rotate(-14 12 14)">
        <rect
          x="3.5"
          y="2.5"
          width="13"
          height="17"
          rx="2.2"
          fill="#c4b5fd"
          stroke="#a78bfa"
          strokeWidth="1"
        />
        <path
          d="M6.2 6.5h7.4M6.2 9.5h7.4M6.2 12.5h5.2"
          stroke="#ede9fe"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>

      {/* Fiche avant — peche pastel, legerement tournee a droite */}
      <g transform="rotate(12 16 14)">
        <rect
          x="11"
          y="3.5"
          width="13"
          height="17"
          rx="2.2"
          fill="#fdba74"
          stroke="#fb923c"
          strokeWidth="1"
        />
        <path
          d="M13.8 7.5h7.4M13.8 10.5h7.4M13.8 13.5h5.2"
          stroke="#ffedd5"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
