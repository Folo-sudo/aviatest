import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/** Silhouette inspiree des avions-courriers Latecoere (Aeropostale / Saint-Exupery). */
export function LatecoerePlaneIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      style={style}
      aria-hidden
    >
      {/* Helices */}
      <ellipse cx="8.5" cy="20" rx="2.2" ry="7.5" fill="currentColor" opacity="0.85" />
      <circle cx="8.5" cy="20" r="1.4" fill="currentColor" />

      {/* Capot moteur + fuselage */}
      <path
        d="M10 20c0-2.6 1.8-4.2 4.2-4.4l22.5-.8c1.4-.1 2.4.7 2.8 1.8l.6 1.7c.3.8.2 1.5-.3 2.1l-1.1 1.3c-.6.7-1.5 1.1-2.5 1.1H14.4C12 22.8 10 21.6 10 20Z"
        fill="currentColor"
      />

      {/* Cabine / cockpit bombé */}
      <path
        d="M22 15.2c1.8-2.4 4.6-3.6 7.6-3.4 1.9.1 3.2 1.4 3.2 3.1v.4H23.1c-.6 0-1.1-.1-1.1-.1Z"
        fill="currentColor"
        opacity="0.9"
      />

      {/* Aile haute (plan Latecoere) */}
      <path
        d="M18 16.2h28.5c1.8 0 3.2.7 3.8 1.8.3.5.1 1-.4 1.2H17.6c-.7 0-1.1-.5-.8-1.1.4-.9 1.3-1.9 1.2-1.9Z"
        fill="currentColor"
      />
      {/* Contre-fiche aile */}
      <path d="M24 19.2 28.5 14.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M33 19.2 30.2 14.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

      {/* Empennage horizontal + derive */}
      <path d="M39.5 18.6h8.2c1.1 0 1.8.6 1.8 1.4s-.7 1.4-1.8 1.4h-7.4l-.8-2.8Z" fill="currentColor" />
      <path
        d="M43.2 12.5c.2-.8 1-1.3 1.8-1.1l2.4.6c.7.2 1.1.8.9 1.5l-1.4 5.2h-2.2l-1.5-6.2Z"
        fill="currentColor"
      />

      {/* Train fixe (roues) */}
      <path d="M20.5 22.5 18.8 28.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M27.5 22.5 29 28.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M19.2 27.8h9.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="18.5" cy="29.5" r="2.6" fill="currentColor" />
      <circle cx="18.5" cy="29.5" r="1" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
      <circle cx="29.8" cy="29.5" r="2.6" fill="currentColor" />
      <circle cx="29.8" cy="29.5" r="1" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />

      {/* Patin de queue */}
      <path d="M44.5 22.2 46.2 27" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="46.5" cy="27.6" r="1.3" fill="currentColor" />
    </svg>
  );
}
