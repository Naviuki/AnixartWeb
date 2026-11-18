// Проверка соответствия флага названию страны: node scripts/country-flag-check.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
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
const { countryFlagSpec } = flags;
const korea = countryFlagSpec("Корея");
const japan = countryFlagSpec("Япония");
assert(korea, "Для Кореи должен быть флаг");
assert(japan, "Для Японии должен быть флаг");
assert.notDeepEqual(korea, japan, "Корея не должна получать японский флаг");
assert(
  korea.parts.some((part) => part.type === "taegeuk"),
  "У флага Кореи должен быть красно-синий тэгык, а не сплошной красный круг"
);
for (const name of ["Южная Корея", "Республика Корея", "Южная корея", " ЮЖНАЯ КОРЕЯ "]) {
  assert.deepEqual(countryFlagSpec(name), korea, `${name}: должен быть флаг Южной Кореи`);
}
for (const name of ["КНДР", "Северная Корея", "Неизвестная страна"]) {
  assert.equal(countryFlagSpec(name), null, `${name}: нельзя подменять флаг Южной Кореей`);
}

const { CountryFlag } = loadTypeScript("app/components/CountryFlag/CountryFlag.tsx", {
  "#/api/countryFlags": flags,
});
const koreaSvg = renderToStaticMarkup(React.createElement(CountryFlag, { country: "Южная Корея", size: 44 }));
const japanSvg = renderToStaticMarkup(React.createElement(CountryFlag, { country: "Япония", size: 44 }));
assert(koreaSvg.includes("#0047a0"), "В SVG Кореи должен быть синий тэгык");
assert(koreaSvg.includes("#cd2e3a"), "В SVG Кореи должен быть красный тэгык");
assert(koreaSvg.includes("trigrams") || koreaSvg.includes("rotate(33.69)"), "В SVG Кореи должны быть триграммы");
assert(!japanSvg.includes("#0047a0"), "В SVG Японии не должно быть корейского тэгыка");

// Остальные страны не должны опознаваться неверной фигурой
const uk = countryFlagSpec("Великобритания");
assert(uk.parts.some((part) => part.type === "unionJack"), "У Великобритании должен быть Юнион Джек");
const ukSvg = renderToStaticMarkup(React.createElement(CountryFlag, { country: "Великобритания", size: 44 }));
assert(ukSvg.includes("#012169"), "У Юнион Джека должен быть синий фон");
assert(ukSvg.includes("#c8102e"), "У Юнион Джека должен быть красный крест");
assert(!ukSvg.includes("<circle"), "Красный круг вместо диагоналей у Юнион Джека недопустим");

const turkey = countryFlagSpec("Турция");
assert(turkey.parts.some((part) => part.type === "crescent"), "У Турции должен быть полумесяц");
assert(turkey.parts.some((part) => part.type === "star"), "У Турции должна быть звезда");

const brazil = countryFlagSpec("Бразилия");
assert(brazil.parts.some((part) => part.type === "diamond"), "У Бразилии должен быть жёлтый ромб");
assert(
  brazil.parts.some((part) => part.type === "circle" && part.color === "#002776"),
  "В ромбе Бразилии должен быть синий круг"
);

const canada = countryFlagSpec("Канада");
assert(canada.parts.some((part) => part.type === "leaf"), "У Канады должен быть кленовый лист");

const china = countryFlagSpec("Китай");
assert(china.parts.some((part) => part.type === "star" && part.count === 5), "У Китая должны быть пять звёзд");

for (const name of ["США", "Америка"]) {
  const stripes = countryFlagSpec(name).parts.find((part) => part.type === "h");
  assert.equal(stripes.colors.length, 13, `У флага ${name} должно быть 13 полос`);
}

const spain = countryFlagSpec("Испания").parts.find((part) => part.type === "h");
assert.equal(JSON.stringify(spain.weights), JSON.stringify([1, 2, 1]), "У Испании жёлтая полоса должна быть вдвое шире");

const india = countryFlagSpec("Индия");
assert(india.parts.some((part) => part.type === "ring"), "У Индии должна быть чакра");

assert(countryFlagSpec("Австралия").parts.some((part) => part.type === "unionJack" && part.canton));

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
  assert(countryFlagSpec(country), `${country}: все страны фильтра должны иметь флаг`);
  assert(countryLanguage(country), `${country}: все страны фильтра должны иметь язык`);
}

console.log("Флаги: Корея отличается от Японии и в разметке, и в данных; страны фильтра и языки корректны");
