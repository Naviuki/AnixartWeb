// Контраст акцентного цвета: подбирает цвет текста на акцентной подложке.
// Пользователь может выбрать любой акцент, поэтому белый текст не всегда читается.

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

const relativeLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrastRatio = (a: string, b: string) => {
  const l1 = relativeLuminance(hexToRgb(a));
  const l2 = relativeLuminance(hexToRgb(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Текст на акцентной плашке: белый, если контраст достаточный, иначе тёмный
export const accentInk = (accent: string) => {
  const white = contrastRatio(accent, "#ffffff");
  if (white >= 4.5) return "#ffffff";
  const dark = contrastRatio(accent, "#0a0b10");
  // Белый всегда лучше тёмного на насыщенных цветах, если он проходит AA для крупного текста
  if (white >= 3 && dark < white) return "#ffffff";
  return dark >= white ? "#0a0b10" : "#ffffff";
};

// Акцент для текста на поверхностях темы: цвет подтягивается, пока не наберёт
// 4.5:1 к фону. На тёмном фоне акцент светлеет, на светлом — темнеет.
export const accentText = (accent: string, background: string) => {
  const target = 4.5;
  const base = contrastRatio(accent, background);
  if (base >= target) return accent;

  const { r, g, b } = hexToRgb(accent);
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");

  const bgLum = relativeLuminance(hexToRgb(background));
  // Идём к белому на тёмном фоне и к чёрному на светлом
  const target255 = bgLum < 0.5 ? 255 : 0;
  const mix = (from: number, to: number, k: number) => from + (to - from) * k;

  for (let step = 1; step <= 20; step++) {
    const k = step / 20;
    const candidate = `#${toHex(mix(r, target255, k))}${toHex(
      mix(g, target255, k)
    )}${toHex(mix(b, target255, k))}`;
    if (contrastRatio(candidate, background) >= target) return candidate;
  }
  return bgLum < 0.5 ? "#ffffff" : "#000000";
};
