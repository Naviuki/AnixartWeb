"use client";

import { useUserStore } from "#/store/auth";
import { useUserPlayerPreferencesStore } from "#/store/player";
import { ENDPOINTS } from "#/api/config";
import { useState, useEffect, useRef } from "react";
import { Spinner } from "#/components/Spinner/Spinner";
import { Icon } from "#/components/Icon/Icon";
import { Dropdown, DropdownItem } from "flowbite-react";

import { usePreferencesStore } from "#/store/preferences";

// Озвучки и плееры могут прийти без нужных полей, поэтому всё читается защищённо
type Voiceover = { id: number; name: string; [key: string]: any };
type Source = { id: number; name: string; [key: string]: any };
type Episode = { position: number; url?: string; name?: string; is_watched?: boolean; [key: string]: any };

type LoadState = "loading" | "ready" | "error" | "empty";

const DropdownTheme = {
  floating: {
    target: "w-full md:min-w-[256px] md:w-fit",
  },
};

const STORAGE_KEY = "anonEpisodesWatched";

// localStorage может содержать битый JSON или данные старого формата
function readWatched(): Record<string, any> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return {};
  }
}

function isPlainObject(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export const getAnonEpisodesWatched = (
  Release: number,
  Source: number,
  Voiceover: number
) => {
  const anonEpisodesWatched = readWatched();

  if (!isPlainObject(anonEpisodesWatched[Release])) {
    anonEpisodesWatched[Release] = {};
  }
  if (!isPlainObject(anonEpisodesWatched[Release][Source])) {
    anonEpisodesWatched[Release][Source] = {};
  }
  if (!isPlainObject(anonEpisodesWatched[Release][Source][Voiceover])) {
    anonEpisodesWatched[Release][Source][Voiceover] = {};
  }

  return anonEpisodesWatched;
};

const getAnonCurrentEpisodeWatched = (
  Release: number,
  Source: number,
  Voiceover: number,
  Episode: number
) => {
  const anonEpisodesWatched = readWatched();

  const byRelease = anonEpisodesWatched[Release];
  if (!isPlainObject(byRelease)) return false;
  const bySource = byRelease[Source];
  if (!isPlainObject(bySource)) return false;
  const byVoiceover = bySource[Voiceover];
  if (!isPlainObject(byVoiceover)) return false;

  return Boolean(byVoiceover[Episode]);
};

export const saveAnonEpisodeWatched = (
  Release: number,
  Source: number,
  Voiceover: number,
  Episode: number
) => {
  try {
    const anonEpisodesWatched = getAnonEpisodesWatched(
      Release,
      Source,
      Voiceover
    );
    anonEpisodesWatched[Release][Source][Voiceover][Episode] = true;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(anonEpisodesWatched));
  } catch {}
};

// Приводит ответ API к массиву с проверкой обязательных полей
function toList(value: any): any[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object");
}

function pickByIdOrName<T extends { id: number; name: string }>(
  list: T[],
  preferredName?: string,
  preferredId?: number
): T | null {
  if (preferredId) {
    const byId = list.find((item) => item.id === preferredId);
    if (byId) return byId;
  }
  if (preferredName) {
    const byName = list.find((item) => item.name === preferredName);
    if (byName) return byName;
  }
  return list[0] || null;
}

export const ReleasePlayer = (props: { id: number }) => {
  const userStore = useUserStore();
  const preferredStore = useUserPlayerPreferencesStore();
  const preferenceStore = usePreferencesStore();

  const [voiceovers, setVoiceovers] = useState<Voiceover[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedVoiceover, setSelectedVoiceover] = useState<Voiceover | null>(
    null
  );
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");

  // Сброс плеера из настроек обнуляет список и заново подбирает озвучку
  const playerResetAt = usePreferencesStore(
    (store) => store.setup?.playerResetAt || 0
  );

  // Номер запроса: ответы от прошлой озвучки или плеера игнорируются
  const requestRef = useRef(0);

  async function requestJson(url: string): Promise<any | null> {
    try {
      const response = await fetch(url);
      // Ответ не годится: ошибка сети, пустое тело или неожиданный код
      if (!response.ok) return null;
      const text = await response.text();
      if (!text) return null;
      const json = JSON.parse(text);
      if (!json || typeof json !== "object") return null;
      return json;
    } catch {
      return null;
    }
  }

  async function loadVoiceovers() {
    const ticket = ++requestRef.current;

    setState("loading");
    setMessage("");
    setSelectedEpisode(null);
    setSelectedSource(null);
    setSources([]);
    setEpisodes([]);

    const data = await requestJson(`${ENDPOINTS.release.episode}/${props.id}`);
    if (ticket !== requestRef.current) return;

    const list = toList(data?.types).filter(
      (item) => item.id !== undefined && item.name
    );
    setVoiceovers(list);

    if (!list.length) {
      setSelectedVoiceover(null);
      setState("empty");
      setMessage("Для этого релиза пока нет озвучек");
      return;
    }

    setSelectedVoiceover(
      pickByIdOrName(list, preferredStore.getPreferredVoiceover(props.id))
    );
  }

  // 1. Озвучки
  useEffect(() => {
    loadVoiceovers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id, playerResetAt]);

  // 2. Плееры для выбранной озвучки
  useEffect(() => {
    if (!selectedVoiceover?.id) return;
    const ticket = ++requestRef.current;

    (async () => {
      setState("loading");
      setMessage("");
      setSelectedSource(null);
      setSelectedEpisode(null);
      setSources([]);
      setEpisodes([]);

      const data = await requestJson(
        `${ENDPOINTS.release.episode}/${props.id}/${selectedVoiceover.id}`
      );
      if (ticket !== requestRef.current) return;

      const list = toList(data?.sources).filter(
        (item) => item.id !== undefined && item.name
      );
      setSources(list);

      if (!list.length) {
        setState("empty");
        setMessage("У этой озвучки нет доступных плееров");
        return;
      }

      setSelectedSource(
        pickByIdOrName(list, preferredStore.getPreferredPlayer(props.id))
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id, selectedVoiceover?.id]);

  // 3. Эпизоды для выбранного плеера
  useEffect(() => {
    if (!selectedVoiceover?.id || !selectedSource?.id) return;
    const ticket = ++requestRef.current;

    (async () => {
      setState("loading");
      setMessage("");
      setSelectedEpisode(null);
      setEpisodes([]);

      let url = `${ENDPOINTS.release.episode}/${props.id}/${selectedVoiceover.id}/${selectedSource.id}`;
      if (userStore.token) {
        url = `${url}?token=${userStore.token}`;
      }

      const data = await requestJson(url);
      if (ticket !== requestRef.current) return;

      const list = toList(data?.episodes).filter(
        (item) => item && item.position !== undefined
      );
      setEpisodes(list);

      if (!list.length) {
        setState("empty");
        setMessage("У этого плеера нет доступных серий");
        return;
      }

      setSelectedEpisode(list[getResumeIndex(list)]);
      setState("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id, selectedVoiceover?.id, selectedSource?.id, userStore.token]);

  // Возвращает индекс последней просмотренной серии, не выходя за границы списка
  function getResumeIndex(list: Episode[]) {
    if (!selectedVoiceover?.id || !selectedSource?.id) return 0;

    const watched = getAnonEpisodesWatched(
      props.id,
      selectedSource.id,
      selectedVoiceover.id
    );
    const saved = watched[props.id][selectedSource.id][selectedVoiceover.id];
    const keys = Object.keys(saved || {});
    if (!keys.length) return 0;

    const last = Number(keys[keys.length - 1]);
    if (!Number.isFinite(last)) return 0;

    // Sibnet отдаёт позиции начиная с нуля, остальные плееры с единицы
    const shifted = selectedSource.name?.includes("Sibnet") ? last : last - 1;
    return Math.min(Math.max(shifted, 0), list.length - 1);
  }

  function selectVoiceover(voiceover: Voiceover) {
    setSelectedVoiceover(voiceover);
    preferredStore.setPreferredVoiceover(props.id, voiceover.name);
  }

  function selectSource(source: Source) {
    setSelectedSource(source);
    preferredStore.setPreferredPlayer(props.id, source.name);
  }

  function addToHistory(episode: Episode) {
    if (!props.id || !selectedSource || !selectedVoiceover || !episode) return;

    const watched = getAnonEpisodesWatched(
      props.id,
      selectedSource.id,
      selectedVoiceover.id
    );
    const alreadyWatched = Boolean(
      watched[props.id][selectedSource.id][selectedVoiceover.id][episode.position]
    );

    if (!preferenceStore.flags.saveWatchHistory || episode.is_watched || alreadyWatched) {
      return;
    }

    episode.is_watched = true;
    saveAnonEpisodeWatched(
      props.id,
      selectedSource.id,
      selectedVoiceover.id,
      episode.position
    );

    if (userStore.token) {
      fetch(
        `${ENDPOINTS.statistic.addHistory}/${props.id}/${selectedSource.id}/${episode.position}?token=${userStore.token}`
      ).catch(() => {});
      fetch(
        `${ENDPOINTS.statistic.markWatched}/${props.id}/${selectedSource.id}/${episode.position}?token=${userStore.token}`
      ).catch(() => {});
    }
  }

  function selectEpisode(episode: Episode) {
    setSelectedEpisode(episode);
    addToHistory(episode);
  }

  // Плеер, у которого нет серий, пропускается автоматически
  function skipSource(source: Source) {
    const rest = sources.filter((item) => item.id !== source.id);
    setSources(rest);
    if (rest.length) {
      setSelectedSource(rest[0]);
    } else {
      setSelectedSource(null);
      setState("empty");
      setMessage("Ни у одного плеера этой озвучки нет серий");
    }
  }

  if (state === "loading" || !selectedVoiceover) {
    const errorLike = state === "error";
    return (
      <div className="box" style={{ padding: 12 }}>
        <div className="player-frame">
          <div className="player-state">
            {errorLike ?
              <>
                <Icon name="info" size={22} />
                <p>{message || "Не удалось загрузить плеер"}</p>
              </>
            : <Spinner />}
          </div>
        </div>
        {state === "empty" && (
          <div className="player-state-note">
            <Icon name="info" size={16} />
            <span>{message}</span>
          </div>
        )}
      </div>
    );
  }

  const canRenderPlayer =
    state === "ready" && !!selectedEpisode && episodes.length > 0 && !!selectedSource;

  return (
    <div className="box" style={{ padding: 12 }}>
      <div className="chiprow" style={{ marginBottom: 10 }}>
        <Dropdown
          label={`Озвучка: ${selectedVoiceover.name}`}
          theme={DropdownTheme}
          renderTrigger={() => (
            <button type="button" className="chip">
              Озвучка: {selectedVoiceover.name}
              <Icon name="chevron" size={14} />
            </button>
          )}
        >
          {voiceovers.map((voiceover) => (
            <DropdownItem
              key={`voiceover_${voiceover.id}`}
              onClick={() => selectVoiceover(voiceover)}
            >
              {voiceover.name}
            </DropdownItem>
          ))}
        </Dropdown>

        {selectedSource && sources.length > 0 && (
          <Dropdown
            label={`Плеер: ${selectedSource.name}`}
            theme={DropdownTheme}
            renderTrigger={() => (
              <button type="button" className="chip">
                Плеер: {selectedSource.name}
                <Icon name="chevron" size={14} />
              </button>
            )}
          >
            {sources.map((source) => (
              <DropdownItem
                key={`source_${source.id}`}
                onClick={() => selectSource(source)}
              >
                {source.name}
              </DropdownItem>
            ))}
          </Dropdown>
        )}
      </div>

      <div className="player-frame">
        {canRenderPlayer && selectedEpisode ?
          <iframe
            allowFullScreen={true}
            src={selectedEpisode.url}
            className="w-full h-full"
            title="Плеер"
          ></iframe>
        : <div className="player-state">
            {state === "empty" ?
              <>
                <Icon name="info" size={22} />
                <p>{message || "Для этого плеера нет серий"}</p>
                {selectedSource && sources.length > 1 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => skipSource(selectedSource)}
                  >
                    Попробовать другой плеер
                  </button>
                )}
              </>
            : <Spinner />}
          </div>}
      </div>

      {state === "ready" && episodes.length > 0 && (
        <div className="epgrid" style={{ marginTop: 10 }}>
          {episodes.map((episode) => {
            const isCurrent = selectedEpisode?.position === episode.position;
            const isWatched =
              Boolean(episode.is_watched) ||
              (selectedSource && selectedVoiceover ?
                getAnonCurrentEpisodeWatched(
                  props.id,
                  selectedSource.id,
                  selectedVoiceover.id,
                  episode.position
                )
              : false);

            return (
              <button
                key={`episode_${episode.position}`}
                type="button"
                className={`ep ${isCurrent ? "on" : ""} ${isWatched ? "done" : ""}`}
                onClick={() => selectEpisode(episode)}
                disabled={isCurrent}
              >
                <span className="ep-check" />
                <span className="ep-n">
                  {episode.name ? episode.name : `${episode.position + 1} Серия`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
