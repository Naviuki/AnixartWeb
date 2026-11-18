// Флаги стран для карточки релиза.
// Эмодзи-флаги зависят от шрифта ОС: без emoji-шрифта вместо флага рисуется
// пустой квадрат. Поэтому флаг собирается из полос — он виден всегда.

type Stripe =
  | { type: "h"; colors: string[]; weights?: number[] } // горизонтальные полосы сверху вниз
  | { type: "v"; colors: string[] } // вертикальные полосы слева направо
  | { type: "circle"; color: string } // круг в центре поверх полос
  | { type: "ring"; color: string } // кольцо (кружок чакры)
  | { type: "canton"; color: string } // квадрат в левом верхнем углу
  | { type: "cross"; color: string } // скандинавский крест
  | { type: "triangle"; color: string } // треугольник у древка
  | { type: "diamond"; color: string } // ромб в центре
  | { type: "crescent"; color: string } // полумесяц
  | { type: "star"; color: string; count?: number; place?: "canton" | "fly" } // звезда (или несколько)
  | { type: "leaf"; color: string } // кленовый лист
  | { type: "unionJack"; canton?: boolean } // Юнион Джек целиком (Великобритания, Австралия)
  | { type: "taegeuk" } // красно-синий тэгык на флаге Южной Кореи
  | { type: "trigrams" }; // четыре чёрные триграммы вокруг него

type FlagSpec = { bg: string; parts: Stripe[] };

// Ключ — начало названия страны в нижнем регистре, как его отдаёт API
const FLAGS: Record<string, FlagSpec> = {
  япон: {
    bg: "#ffffff",
    parts: [{ type: "circle", color: "#bc002d" }],
  },
  китай: {
    bg: "#de2910",
    parts: [{ type: "star", color: "#ffde00", count: 5 }],
  },
  коре: {
    bg: "#ffffff",
    parts: [{ type: "taegeuk" }, { type: "trigrams" }],
  },
  сша: {
    bg: "#ffffff",
    parts: [
      {
        type: "h",
        colors: [
          "#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234",
          "#ffffff", "#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234",
        ],
      },
      { type: "canton", color: "#3c3b6e" },
      { type: "star", color: "#ffffff", count: 6 },
    ],
  },
  америк: {
    bg: "#ffffff",
    parts: [
      {
        type: "h",
        colors: [
          "#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234",
          "#ffffff", "#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234",
        ],
      },
      { type: "canton", color: "#3c3b6e" },
      { type: "star", color: "#ffffff", count: 6 },
    ],
  },
  росси: { bg: "#ffffff", parts: [{ type: "h", colors: ["#ffffff", "#0039a6", "#d52b1e"] }] },
  франц: { bg: "#ffffff", parts: [{ type: "v", colors: ["#0055a4", "#ffffff", "#ef4135"] }] },
  герман: { bg: "#000000", parts: [{ type: "h", colors: ["#000000", "#dd0000", "#ffce00"] }] },
  итал: { bg: "#ffffff", parts: [{ type: "v", colors: ["#009246", "#ffffff", "#ce2b37"] }] },
  испан: {
    bg: "#aa151b",
    parts: [{ type: "h", colors: ["#aa151b", "#f1bf00", "#aa151b"], weights: [1, 2, 1] }],
  },
  великобритан: { bg: "#012169", parts: [{ type: "unionJack" }] },
  англ: { bg: "#012169", parts: [{ type: "unionJack" }] },
  канад: {
    bg: "#ffffff",
    parts: [{ type: "v", colors: ["#ff0000", "#ffffff", "#ff0000"] }, { type: "leaf", color: "#ff0000" }],
  },
  тайва: { bg: "#fe0000", parts: [{ type: "canton", color: "#000095" }] },
  гонкон: { bg: "#de2910", parts: [{ type: "circle", color: "#ffffff" }] },
  таиланд: {
    bg: "#a51931",
    parts: [{ type: "h", colors: ["#a51931", "#f4f5f8", "#2d2a4a", "#f4f5f8", "#a51931"] }],
  },
  инди: {
    bg: "#ffffff",
    parts: [{ type: "h", colors: ["#ff9933", "#ffffff", "#138808"] }, { type: "ring", color: "#000080" }],
  },
  бразил: { bg: "#009c3b", parts: [{ type: "diamond", color: "#ffdf00" }, { type: "circle", color: "#002776" }] },
  австрал: {
    bg: "#012169",
    parts: [
      { type: "canton", color: "#ffffff" },
      { type: "unionJack", canton: true },
      { type: "star", color: "#ffffff", count: 5, place: "fly" },
    ],
  },
  польш: { bg: "#ffffff", parts: [{ type: "h", colors: ["#ffffff", "#dc143c"] }] },
  турци: {
    bg: "#e30a17",
    parts: [{ type: "crescent", color: "#ffffff" }, { type: "star", color: "#ffffff", count: 1 }],
  },
  швеци: {
    bg: "#006aa7",
    parts: [{ type: "cross", color: "#fecc00" }],
  },
  нидерланд: { bg: "#ffffff", parts: [{ type: "h", colors: ["#ae1c28", "#ffffff", "#21468b"] }] },
};

// Возвращает описание флага или null, если страна незнакома
export const countryFlagSpec = (country?: string | null): FlagSpec | null => {
  if (!country) return null;
  const value = country.trim().toLowerCase().replace(/\s+/g, " ");
  if (!value) return null;
  // В API Корея без уточнения означает Южную Корею. Полные названия
  // распознаём явно, а Северную Корею не подменяем южнокорейским флагом.
  if (
    value === "южная корея" ||
    value === "республика корея" ||
    value.startsWith("южная корея ")
  ) {
    return FLAGS.коре;
  }
  if (value === "кндр" || value.includes("северн")) return null;
  if (FLAGS[value]) return FLAGS[value];
  for (const [key, spec] of Object.entries(FLAGS)) {
    if (value.startsWith(key)) return spec;
  }
  return null;
};

// Для текста (например, в title) — просто название страны без эмодзи
export const hasCountryFlag = (country?: string | null) =>
  Boolean(countryFlagSpec(country));
