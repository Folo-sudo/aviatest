/** Map a pointer event to canvas logical coordinates (handles CSS scaling). */
export function canvasPoint(
  e: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  logicalW: number,
  logicalH: number,
): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return { x: 0, y: 0 };
  return {
    x: ((e.clientX - r.left) / r.width) * logicalW,
    y: ((e.clientY - r.top) / r.height) * logicalH,
  };
}
