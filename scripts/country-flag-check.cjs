// Проверка соответствия флага названию страны: node scripts/country-flag-check.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function loadTypeScript(file, mocks = {}) {
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const sandboxModule = { exports: {} };
  const localRequire = (id) => mocks[id] || require(id);
  vm.runInNewContext(
    `(function(exports, module, require) { ${compiled}\n })(module.exports, module, require);`,
    { module: sandboxModule, require: localRequire }
  );
  return sandboxModule.exports;
}

const flags = loadTypeScript("app/api/countryFlags.ts");
const { countryFlagCode, countryFlagSrc } = flags;

const korea = countryFlagCode("Корея");
const japan = countryFlagCode("Япония");
assert.equal(korea, "kr", "Корея должна получать флаг Южной Кореи");
assert.equal(japan, "jp", "Япония должна получать флаг Японии");
assert.notEqual(korea, japan, "Корея не должна получать японский флаг");
for (const name of ["Южная Корея", "Республика Корея", "Южная корея", " ЮЖНАЯ КОРЕЯ "]) {
  assert.equal(countryFlagCode(name), "kr", `${name}: должен быть флаг Южной Кореи`);
}
for (const name of ["КНДР", "Северная Корея", "Неизвестная страна"]) {
  assert.equal(countryFlagCode(name), null, `${name}: нельзя подменять флаг Южной Кореей`);
}

const { CountryFlag } = loadTypeScript("app/components/CountryFlag/CountryFlag.tsx", {
  "#/api/countryFlags": flags,
});
const koreaHtml = renderToStaticMarkup(React.createElement(CountryFlag, { country: "Южная Корея", size: 44 }));
const japanHtml = renderToStaticMarkup(React.createElement(CountryFlag, { country: "Япония", size: 44 }));
assert(koreaHtml.includes('src="/flags/kr.svg"'), "Флаг Кореи должен ссылаться на /flags/kr.svg");
assert(japanHtml.includes('src="/flags/jp.svg"'), "Флаг Японии должен ссылаться на /flags/jp.svg");
assert(!koreaHtml.includes("<circle"), "Ручная отрисовка флага больше не используется");
assert(
  renderToStaticMarkup(React.createElement(CountryFlag, { country: "Неизвестная страна" })) === "",
  "Для незнакомой страны флаг не рисуется"
);

// Каждый флаг — отдельный файл в public/flags, иначе на сайте будет битая картинка
const expected = {
  Япония: "jp",
  Китай: "cn",
  Корея: "kr",
  США: "us",
  Америка: "us",
  Россия: "ru",
  Франция: "fr",
  Германия: "de",
  Италия: "it",
  Испания: "es",
  Великобритания: "gb",
  Англия: "gb",
  Канада: "ca",
  Тайвань: "tw",
  Гонконг: "hk",
  Таиланд: "th",
  Индия: "in",
  Бразилия: "br",
  Австралия: "au",
  Польша: "pl",
  Турция: "tr",
  Швеция: "se",
  Нидерланды: "nl",
};
for (const [country, code] of Object.entries(expected)) {
  assert.equal(countryFlagCode(country), code, `${country}: должен быть код ${code}`);
  const src = countryFlagSrc(country);
  assert.equal(src, `/flags/${code}.svg`, `${country}: путь к флагу ${src}`);
  const file = path.join("public", "flags", `${code}.svg`);
  assert(fs.existsSync(file), `${country}: нет файла ${file}`);
  const svg = fs.readFileSync(file, "utf8");
  assert(svg.trimStart().startsWith("<svg"), `${file}: должен быть SVG`);
  assert(svg.includes("viewBox"), `${file}: у SVG должен быть viewBox`);
}
assert(fs.existsSync("public/flags/LICENSE"), "Лицензия набора флагов должна лежать рядом с файлами");

const { countryLanguage } = loadTypeScript("app/api/country.ts");
for (const [country, language] of [
  ["Япония", "японский"],
  ["Китай", "китайский"],
  ["Южная Корея", "корейский"],
  ["Республика Корея", "корейский"],
  ["Швеция", "шведский"],
  ["Нидерланды", "нидерландский"],
]) {
  assert.equal(countryLanguage(country), language, `${country}: язык должен соответствовать стране`);
}
for (const country of ["Северная Корея", "КНДР", "Неизвестная страна"]) {
  assert.equal(countryLanguage(country), "", `${country}: язык не должен выдумываться`);
}
for (const country of ["Япония", "Китай", "Южная Корея"]) {
  assert(countryFlagCode(country), `${country}: все страны фильтра должны иметь флаг`);
  assert(countryLanguage(country), `${country}: все страны фильтра должны иметь язык`);
}

console.log("Флаги: страны получают верный код, файлы SVG на месте, Корея отличается от Японии");
