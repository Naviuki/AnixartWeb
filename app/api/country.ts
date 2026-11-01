// Флаги стран для карточки релиза: берутся из эмодзи, отдельные картинки не нужны.
// Ключ — начало названия страны в нижнем регистре, как его отдаёт API.

const COUNTRY_FLAGS: Record<string, string> = {
  япон: "🇯🇵",
  китай: "🇨🇳",
  кит: "🇨🇳",
  коре: "🇰🇷",
  сша: "🇺🇸",
  америк: "🇺🇸",
  росси: "🇷🇺",
  франц: "🇫🇷",
  герман: "🇩🇪",
  итал: "🇮🇹",
  испан: "🇪🇸",
  великобритан: "🇬🇧",
  англ: "🇬🇧",
  канад: "🇨🇦",
  тайва: "🇹🇼",
  гонкон: "🇭🇰",
  таиланд: "🇹🇭",
  инди: "🇮🇳",
  бразил: "🇧🇷",
  австрал: "🇦🇺",
  польш: "🇵🇱",
  турци: "🇹🇷",
  швеци: "🇸🇪",
  нидерланд: "🇳🇱",
};

// Возвращает эмодзи-флаг или пустую строку, если страна незнакома
export const countryFlag = (country?: string | null): string => {
  if (!country) return "";
  const value = country.trim().toLowerCase();
  if (!value) return "";
  if (COUNTRY_FLAGS[value]) return COUNTRY_FLAGS[value];
  for (const [key, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (value.startsWith(key)) return flag;
  }
  return "";
};

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
