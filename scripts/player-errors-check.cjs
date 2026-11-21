// Ошибки API не должны превращаться в новые исключения внутри плеера.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("app/components/ReleasePlayer/PlayerParsing.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sandboxModule = { exports: {} };
let parserFetch = async () => ({ ok: true, text: async () => "{}" });
const sandbox = {
  module: sandboxModule,
  console,
  process: { env: {} },
  URL,
  URLSearchParams,
  File: class File extends Blob {
    constructor(parts, name, options) { super(parts, options); this.name = name; }
  },
  fetch: (...args) => parserFetch(...args),
};
vm.runInNewContext(
  `(function(exports, module, require) { ${compiled}\n })(module.exports, module, require);`,
  {
    ...sandbox,
    require: (id) => id === "#/api/utils" ? {
      tryCatchAPI: async () => ({ data: null, error: { code: 500, message: "Тестовый сбой" } }),
      tryCatchPlayer: async () => ({}),
    } : require(id),
  }
);

(async () => {
  const errors = [];
  const setPlayerError = (error) => errors.push(error);
  const result = await sandboxModule.exports._fetchAPI(
    "/episode/test",
    "Не удалось загрузить источники",
    setPlayerError
  );
  assert.equal(result, null);
  assert.equal(errors.length, 1);
  assert.match(errors[0].detail, /500/);

  for (const fetchManifest of [
    sandboxModule.exports._fetchKodikManifest,
    sandboxModule.exports._fetchAnilibriaManifest,
    sandboxModule.exports._fetchSibnetManifest,
  ]) {
    const result = await fetchManifest(
      "https://kodikplayer.com/video/test",
      setPlayerError
    );
    assert.equal(result.manifest, null, "Ответ 200 без manifest нельзя превращать в видео");
    assert.equal(result.poster, null);
  }
  parserFetch = async () => ({
    ok: false,
    status: 500,
    text: async () => JSON.stringify({
      message: "SIBNET: Доступ к странице плеера запрещён (HTTP 403)",
    }),
  });
  const sibnet = await sandboxModule.exports._fetchSibnetManifest(
    "https://video.sibnet.ru/shell.php?videoid=test",
    setPlayerError
  );
  assert.equal(sibnet.manifest, null);
  const sibnetError = errors.at(-1);
  assert.equal(sibnetError.message, "Sibnet не отдал видео");
  assert.match(sibnetError.detail, /HTTP 403/);
  assert.match(sibnetError.detail, /меню «Плеер»/);
  assert.match(sibnetError.detail, /другую озвучку/);

  console.log("Обработка ошибок плеера: пустые и неудачные ответы не вызывают исключений");
  console.log("Sibnet: HTTP 403 объяснён, предложен другой источник");
})().catch((error) => { console.error(error); process.exit(1); });
