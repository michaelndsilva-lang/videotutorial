// Rampa ordinal de um único matiz (dourado da marca), validada com o método do
// skill dataviz: L monotônica, ΔL >= 0.06 entre passos, ponta clara com
// contraste >= 2:1 no fundo do card. Usada para categorias ORDENADAS (etapas
// do funil), nunca para identidade (isso é o par categórico abaixo).
function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  let r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  const gamma = (v: number) => {
    const c2 = Math.max(0, Math.min(1, v));
    return c2 <= 0.0031308 ? 12.92 * c2 : 1.055 * Math.pow(c2, 1 / 2.4) - 0.055;
  };
  r = gamma(r);
  g = gamma(g);
  bb = gamma(bb);
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(bb)}`;
}

// Extremos validados (node scripts/validate_palette.js ... --ordinal): PASS em
// ambos os modos (monotonia, ΔL, contraste na ponta clara, matiz único).
const RAMP_ENDPOINTS = {
  light: { lStart: 0.75, lEnd: 0.39, cStart: 0.12, cEnd: 0.15, hue: 60 },
  dark: { lStart: 0.5, lEnd: 0.82, cStart: 0.13, cEnd: 0.15, hue: 60 },
} as const;

export function ordinalGoldRamp(steps: number, mode: "light" | "dark"): string[] {
  const { lStart, lEnd, cStart, cEnd, hue } = RAMP_ENDPOINTS[mode];
  if (steps <= 1) return [oklchToHex(lStart, cStart, hue)];
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    const l = lStart + (lEnd - lStart) * t;
    const c = cStart + (cEnd - cStart) * t;
    return oklchToHex(l, c, hue);
  });
}
