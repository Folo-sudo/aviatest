#!/usr/bin/env python3
"""
Extract the black silhouette from each Level 4 EPLtest screenshot.

Strategy:
  1. Load the screenshot (2560x1440 PNG with white background).
  2. Mask out regions we know are NOT the silhouette:
       - Top 200px (clock + title bar)
       - Bottom 100px (Windows taskbar)
       - The small input box that sits just below the shape.
  3. Find connected components of "dark" pixels within the remaining ROI.
  4. Keep the LARGEST connected component (= the silhouette), drop small ones
     (= the H/B labels, which are 20-40 pixels wide).
  5. Crop tight around the silhouette + 10px margin.
  6. Output a PNG with:
       - Silhouette kept as black pixels (alpha 255)
       - Everything else transparent (alpha 0)
"""
from PIL import Image
import numpy as np
import os
import sys
from collections import deque

SRC_DIR = "tmp-level4-sources"
OUT_DIR = "public/images/quadrilogie-angles/objects"
MARGIN = 10           # px of padding around the bounding box
DARK_THRESHOLD = 100  # pixels with R+G+B / 3 < this are "dark"
MIN_COMPONENT_SIZE = 500  # drop components smaller than this (H/B labels)

os.makedirs(OUT_DIR, exist_ok=True)

def find_components(mask):
    """Iterative flood fill to find connected components in a binary mask.
    Returns a list of (size, (y0,y1,x0,x1), pixel_list) sorted by size desc."""
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    components = []

    for y0 in range(h):
        for x0 in range(w):
            if mask[y0, x0] and not visited[y0, x0]:
                # BFS flood fill
                queue = deque([(y0, x0)])
                visited[y0, x0] = True
                pixels = []
                ymin, ymax, xmin, xmax = y0, y0, x0, x0
                while queue:
                    y, x = queue.popleft()
                    pixels.append((y, x))
                    ymin = min(ymin, y); ymax = max(ymax, y)
                    xmin = min(xmin, x); xmax = max(xmax, x)
                    for dy, dx in ((-1,0),(1,0),(0,-1),(0,1)):
                        ny, nx = y+dy, x+dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny,nx] and not visited[ny,nx]:
                            visited[ny, nx] = True
                            queue.append((ny, nx))
                components.append((len(pixels), (ymin, ymax, xmin, xmax), pixels))
    components.sort(key=lambda c: -c[0])
    return components


def process_image(src_path, out_path):
    img = Image.open(src_path).convert('RGB')
    arr = np.array(img)
    h, w, _ = arr.shape

    # ROI: middle band (avoid clock at top, taskbar at bottom)
    y_start = 200
    y_end = 1340
    roi = arr[y_start:y_end, :, :]

    # Dark mask (average RGB < threshold)
    gray = roi.mean(axis=2)
    mask = gray < DARK_THRESHOLD

    components = find_components(mask)
    if not components:
        print(f"  [WARN] no dark component found in {src_path}")
        return False

    # Proximity-based selection: keep the largest component + any other component
    # whose bounding box is close (within PROXIMITY_PX) of the main one.
    # This covers multi-part shapes (piquets, cannon handles) while excluding H/B
    # labels which are typically 60-120px AWAY from the shape.
    PROXIMITY_PX = 30
    MIN_KEEP_SIZE = 150  # absolute floor to reject noise (< a small letter)
    main_size = components[0][0]
    if main_size < MIN_COMPONENT_SIZE:
        print(f"  [WARN] largest component too small ({main_size}px) in {src_path}")
        return False

    main_ymin, main_ymax, main_xmin, main_xmax = components[0][1]

    def bbox_distance(bbox_a, bbox_b):
        """L-infinity distance between two bounding boxes (0 if overlapping)."""
        a_ymin, a_ymax, a_xmin, a_xmax = bbox_a
        b_ymin, b_ymax, b_xmin, b_xmax = bbox_b
        dy = max(0, max(a_ymin - b_ymax, b_ymin - a_ymax))
        dx = max(0, max(a_xmin - b_xmax, b_xmin - a_xmax))
        return max(dy, dx)

    main_bbox = components[0][1]
    kept = [components[0]]  # always keep main
    for c in components[1:]:
        size, bbox, _ = c
        if size < MIN_KEEP_SIZE:
            continue
        if bbox_distance(main_bbox, bbox) <= PROXIMITY_PX:
            kept.append(c)

    # Compute combined bounding box of all kept components
    ymin = min(c[1][0] for c in kept)
    ymax = max(c[1][1] for c in kept)
    xmin = min(c[1][2] for c in kept)
    xmax = max(c[1][3] for c in kept)

    # Build a mask of the kept pixels (so we can zero-out H/B labels that might
    # still fall inside the bounding box).
    kept_mask = np.zeros_like(mask)
    for _, _, pixels in kept:
        for (py, px) in pixels:
            kept_mask[py, px] = True

    # Convert ROI coords back to image coords
    ymin_img = ymin + y_start
    ymax_img = ymax + y_start

    # Apply margin, clamp
    y0 = max(0, ymin_img - MARGIN)
    y1 = min(h, ymax_img + MARGIN + 1)
    x0 = max(0, xmin - MARGIN)
    x1 = min(w, xmax + MARGIN + 1)

    # Create a grayscale array for the crop, using only the kept component pixels.
    # Pixels inside a kept component -> use the original gray value (so we keep
    # soft edges). Pixels NOT in any kept component -> treat as white (transparent).
    full_gray = arr.mean(axis=2)
    # Start with "white" everywhere
    masked_gray = np.full_like(full_gray, 255)
    # Copy original grayscale values where kept_mask is True (need ROI offset)
    roi_kept_mask = np.zeros_like(full_gray, dtype=bool)
    roi_kept_mask[y_start:y_end, :] = kept_mask
    masked_gray[roi_kept_mask] = full_gray[roi_kept_mask]

    crop_gray = masked_gray[y0:y1, x0:x1]

    # Alpha = 255 where dark, 0 where light. Smooth edges via linear ramp.
    alpha = np.where(
        crop_gray < DARK_THRESHOLD,
        255,
        np.where(crop_gray > 200, 0, (255 - crop_gray).astype(np.uint8))
    ).astype(np.uint8)

    # Force silhouette color to pure black
    rgb = np.zeros((alpha.shape[0], alpha.shape[1], 3), dtype=np.uint8)
    rgba = np.dstack([rgb, alpha])

    out_img = Image.fromarray(rgba, 'RGBA')
    # Resize so the longest side is at most 600 px (keeps file size reasonable)
    max_side = max(out_img.size)
    if max_side > 600:
        scale = 600 / max_side
        new_size = (int(out_img.size[0] * scale), int(out_img.size[1] * scale))
        out_img = out_img.resize(new_size, Image.LANCZOS)

    out_img.save(out_path, 'PNG', optimize=True)
    return True


def main():
    sources = sorted(
        [f for f in os.listdir(SRC_DIR) if f.endswith('.png')],
        key=lambda s: int(s.replace('source-', '').replace('.png', ''))
    )
    print(f"Processing {len(sources)} images from {SRC_DIR} -> {OUT_DIR}")
    ok = 0
    for src in sources:
        src_path = os.path.join(SRC_DIR, src)
        # Keep the same numeric index in the output name
        idx = src.replace('source-', '').replace('.png', '')
        out_path = os.path.join(OUT_DIR, f"shape-{idx}.png")
        success = process_image(src_path, out_path)
        status = "OK" if success else "FAIL"
        print(f"  {status}  {src} -> {out_path}")
        if success:
            ok += 1
    print(f"Done: {ok}/{len(sources)} extracted")


if __name__ == '__main__':
    main()
