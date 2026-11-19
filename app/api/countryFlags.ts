// Флаги стран для карточки релиза.
// Используем официальные SVG-флаги из набора flag-icons (MIT, см. public/flags/LICENSE).
// Файлы лежат локально в public/flags, поэтому флаги видны без сети и не зависят
// от того, установлен ли в системе шрифт с эмодзи.

// Ключ — начало названия страны в нижнем регистре, как его отдаёт API
const COUNTRY_FLAGS: Record<string, string> = {
  япон: "jp",
  китай: "cn",
  коре: "kr",
  сша: "us",
  америк: "us",
  росси: "ru",
  франц: "fr",
  герман: "de",
  итал: "it",
  испан: "es",
  великобритан: "gb",
  англ: "gb",
  канад: "ca",
  тайва: "tw",
  гонкон: "hk",
  таиланд: "th",
  инди: "in",
  бразил: "br",
  австрал: "au",
  польш: "pl",
  турци: "tr",
  швеци: "se",
  нидерланд: "nl",
};

// Возвращает код флага (имя файла в public/flags) или null, если страна незнакома
export const countryFlagCode = (country?: string | null): string | null => {
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
    return COUNTRY_FLAGS.коре;
  }
  if (value === "кндр" || value.includes("северн")) return null;
  if (COUNTRY_FLAGS[value]) return COUNTRY_FLAGS[value];
  for (const [key, code] of Object.entries(COUNTRY_FLAGS)) {
    if (value.startsWith(key)) return code;
  }
  return null;
};

// Путь к файлу флага для src или null, если страны нет в наборе
export const countryFlagSrc = (country?: string | null): string | null => {
  const code = countryFlagCode(country);
  return code ? `/flags/${code}.svg` : null;
};

// Для текста (например, в title) — просто название страны без эмодзи
export const hasCountryFlag = (country?: string | null) => Boolean(countryFlagCode(country));
