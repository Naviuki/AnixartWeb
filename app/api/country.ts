// Флаги стран живут в countryFlags.ts и рисуются SVG-компонентом:
// эмодзи-флаги не отображаются без emoji-шрифта в системе.
// Здесь остаётся только прилагательное языка по стране: «Япония» → «японский»

// Прилагательное языка по стране: «Япония» → «японский»
const COUNTRY_LANGUAGE: Record<string, string> = {
  япон: "японский",
  китай: "китайский",
  кит: "китайский",
  коре: "корейский",
  сша: "английский",
  америк: "английский",
  росси: "русский",
  франц: "французский",
  герман: "немецкий",
  итал: "итальянский",
  испан: "испанский",
  великобритан: "английский",
  англ: "английский",
  канад: "английский",
  тайва: "китайский",
  гонкон: "китайский",
  таиланд: "тайский",
  инди: "хинди",
  бразил: "португальский",
  австрал: "английский",
  польш: "польский",
  турци: "турецкий",
};

export const countryLanguage = (country?: string | null): string => {
  if (!country) return "";
  const value = country.trim().toLowerCase();
  if (COUNTRY_LANGUAGE[value]) return COUNTRY_LANGUAGE[value];
  for (const [key, language] of Object.entries(COUNTRY_LANGUAGE)) {
    if (value.startsWith(key)) return language;
  }
  return "";
};
