function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

export function accentInk(hex: string): string {
  return luminance(hex) > 0.3 ? "#0a0c0f" : "#ffffff";
}

export function accentText(hex: string, theme: "dark" | "light" = "dark"): string {
  const lum = luminance(hex);
  if (theme === "light") {
    return lum > 0.3 ? `color-mix(in oklch, ${hex} 48%, black)` : hex;
  }
  return lum < 0.2 ? `color-mix(in oklch, ${hex} 55%, white)` : hex;
}
