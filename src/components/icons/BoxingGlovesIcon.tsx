'use client';

import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BoxingGlovesAccent = 'red' | 'blue';

const SRC: Record<BoxingGlovesAccent, string> = {
  red: '/icons/sparing-gloves-red.png',
  blue: '/icons/sparing-gloves-blue.png',
};

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  /** red = Sparing ×, blue = Sparing +- */
  accent?: BoxingGlovesAccent;
};

/**
 * Sticker boxing-gloves logo from the Sparing reference art.
 * Rendered as PNG so the silhouette matches the source exactly.
 */
export function BoxingGlovesIcon({
  className,
  accent = 'red',
  ...props
}: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC[accent]}
      alt=""
      draggable={false}
      className={cn('h-5 w-auto object-contain select-none', className)}
      {...props}
    />
  );
}
