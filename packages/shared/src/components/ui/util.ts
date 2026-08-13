// LUMINA GLASS UI — shared helpers. The ONLY place a color string may be
// assembled: components derive every tint from a token + alpha via
// `withOpacity`, never from raw literals.

/**
 * Apply an opacity to a token color. Accepts `#rgb`, `#rrggbb`, `rgb(...)`
 * or `rgba(...)` input and returns an `rgba(...)` string with the given
 * alpha (replacing any existing alpha).
 */
export function withOpacity(hexOrRgb: string, alpha: number): string {
  const value = hexOrRgb.trim();

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const match = value.match(/^rgba?\(([^)]+)\)$/i);
  if (match && match[1]) {
    const [r, g, b] = match[1].split(',').map((part) => part.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Unknown format — return unchanged rather than produce an invalid color.
  return value;
}
