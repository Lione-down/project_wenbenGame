const COMPACT_VIEWPORT_MAX_WIDTH = 719;
const COMPACT_LANDSCAPE_MAX_WIDTH = 950;
const COMPACT_LANDSCAPE_MAX_HEIGHT = 500;

export function shouldUseCompactViewport(width, height) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return true;
  }
  return width <= COMPACT_VIEWPORT_MAX_WIDTH
    || (width <= COMPACT_LANDSCAPE_MAX_WIDTH && height <= COMPACT_LANDSCAPE_MAX_HEIGHT);
}
