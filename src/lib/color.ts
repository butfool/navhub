// Color helpers used by IconColorPicker and the rendered cards.
// The data model stores a single soft background color (rgba with alpha 0.15);
// the foreground (icon stroke) is always derived from it so they stay in sync.

export const DEFAULT_ALPHA = 0.15;

export const hexToRgba = (hex: string, alpha: number = DEFAULT_ALPHA): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const rgbaToHex = (rgba: string): string => {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return '#8b5cf6';
  const toHex = (n: string) => parseInt(n, 10).toString(16).padStart(2, '0');
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
};

// Foreground (icon stroke). Solid RGB at full opacity, same hue as the
// background. Used by both the picker preview and the rendered card.
export const rgbaToForeground = (rgba: string): string => {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return 'rgb(139,92,246)';
  return `rgb(${match[1]},${match[2]},${match[3]})`;
};

// Build a soft 135deg gradient from a single brand color. Used for the
// section-icon container: a brighter top-left fading to a darker bottom-right
// keeps icons visible while looking like a glassy chip.
export const rgbaToGradient = (rgba: string): string => {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(34,211,238,0.15))';
  const [, r, g, b] = match;
  return `linear-gradient(135deg, rgba(${r},${g},${b},0.45) 0%, rgba(${r},${g},${b},0.15) 100%)`;
};
