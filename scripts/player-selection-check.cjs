// Пустые каталоги и устаревшие ответы не должны ломать или переключать плеер.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const flush = () => new Promise((resolve) => setImmediate(resolve));

function loadComponent(file, fetchAPI) {
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const cleanups = [];
  const playerStore = () => ({
    getPreferredPlayer: () => undefined,
    getPreferredVoiceover: () => undefined,
    setPreferredPlayer: () => {},
    setPreferredVoiceover: () => {},
  });
  const mocks = {
    react: {
      useEffect: (effect) => { cleanups.push(effect()); },
      useState: (initial) => [initial, () => {}],
    },
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null, Fragment: "fragment" },
    "#/api/config": { ENDPOINTS: { release: { episode: "/api/proxy/episode" } } },
    "#/api/utils": { numberDeclension: () => "серий" },
    "#/store/player": { useUserPlayerPreferencesStore: playerStore },
    "#/components/Icon/Icon": { Icon: () => null },
    "./PlayerParsing": { _fetchAPI: fetchAPI },
    "./ReleasePlayer": {
      getAnonEpisodesWatched: () => ({ 1: { 2: { 3: {} } } }),
    },
  };
  vm.runInNewContext(
    `(function(exports, module, require) { ${compiled}\n })(module.exports, module, require);`,
    {
      module,
      console,
      require: (id) => {
        if (mocks[id]) return mocks[id];
        if (id.endsWith("SelectorMenu") || id.endsWith("SourceSelectorMenu")) return {};
        return require(id);
      },
    },
    { filename: file }
  );
  return { component: Object.values(module.exports)[0], cleanups };
}

(async () => {
  {
    const updates = [];
    const errors = [];
    const { component } = loadComponent(
      "app/components/ReleasePlayer/SourceSelectorMenu.tsx",
      async () => ({ sources: [] })
    );
    component({
      release_id: 1,
      voiceover: { id: 3 },
      source: null,
      sourceList: null,
      setSource: (value) => updates.push(value),
      setPlayerError: (value) => errors.push(value),
    });
    await flush();
    assert.equal(updates[0].selected, null);
    assert.deepEqual(Array.from(updates[0].available), []);
    assert.equal(errors.length, 1, "Пустой список источников должен объясняться пользователю");
  }

  {
    const updates = [];
    const errors = [];
    const { component } = loadComponent(
      "app/components/ReleasePlayer/VoiceoverSelectorMenu.tsx",
      async () => ({ types: [] })
    );
    component({
      release_id: 1,
      token: null,
      voiceover: null,
      voiceoverList: null,
      setVoiceover: (value) => updates.push(value),
      setPlayerError: (value) => errors.push(value),
    });
    await flush();
    assert.equal(updates[0].selected, null);
    assert.deepEqual(Array.from(updates[0].available), []);
    assert.equal(errors.length, 1, "Пустой список озвучек должен объясняться пользователю");
  }

  {
    const updates = [];
    const errors = [];
    const { component } = loadComponent(
      "app/components/ReleasePlayer/EpisodeSelectorMenu.tsx",
      async () => ({ episodes: [] })
    );
    component({
      release_id: 1,
      token: null,
      voiceover: { id: 3 },
      source: { id: 2 },
      episode: null,
      episodeList: null,
      setEpisode: (value) => updates.push(value),
      setPlayerError: (value) => errors.push(value),
    });
    await flush();
    assert.equal(updates[0].selected, null);
    assert.deepEqual(Array.from(updates[0].available), []);
    assert.equal(errors.length, 1, "Пустой список серий должен объясняться пользователю");
  }

  {
    const pending = [];
    const updates = [];
    const { component, cleanups } = loadComponent(
      "app/components/ReleasePlayer/SourceSelectorMenu.tsx",
      () => new Promise((resolve) => pending.push(resolve))
    );
    const props = {
      release_id: 1,
      source: null,
      sourceList: null,
      setSource: (value) => updates.push(value),
      setPlayerError: () => {},
    };
    component({ ...props, voiceover: { id: 1 } });
    assert.equal(typeof cleanups[0], "function", "Эффект загрузки должен иметь cleanup");
    cleanups[0]();
    component({ ...props, voiceover: { id: 2 } });
    pending[1]({ sources: [{ id: 22, name: "Новый", episodes_count: 1 }] });
    await flush();
    pending[0]({ sources: [{ id: 11, name: "Старый", episodes_count: 1 }] });
    await flush();
    assert.equal(updates.length, 1, "Устаревший ответ не должен менять выбранный источник");
    assert.equal(updates[0].selected.id, 22);
  }

  console.log("Выбор плеера: пустые списки обработаны, устаревшие ответы отброшены");
})().catch((error) => { console.error(error); process.exit(1); });
