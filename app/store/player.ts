"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { deepmerge } from "deepmerge-ts";

// Действия плеера, на которые можно назначить клавишу
export type PlayerAction =
  | "togglePlay"
  | "back"
  | "forward"
  | "jump"
  | "volumeUp"
  | "volumeDown"
  | "mute"
  | "fullscreen"
  | "pip"
  | "nextEpisode"
  | "prevEpisode";

// Шаги перемотки кнопками и клавишами, в секундах
export interface PlayerSeekSteps {
  back: number;
  forward: number;
  jump: number;
}

// Клавиша в виде KeyboardEvent.code, можно с модификаторами: "Shift+ArrowRight"
export type PlayerKeys = Record<PlayerAction, string>;

export const PLAYER_ACTIONS: {
  action: PlayerAction;
  title: string;
  hint?: string;
}[] = [
  { action: "togglePlay", title: "Воспроизведение и пауза" },
  { action: "back", title: "Назад", hint: "на шаг назад" },
  { action: "forward", title: "Вперёд", hint: "на шаг вперёд" },
  { action: "jump", title: "Большой шаг", hint: "пропуск заставки" },
  { action: "volumeUp", title: "Громче" },
  { action: "volumeDown", title: "Тише" },
  { action: "mute", title: "Звук" },
  { action: "fullscreen", title: "Полный экран" },
  { action: "pip", title: "Картинка в картинке" },
  { action: "nextEpisode", title: "Следующая серия" },
  { action: "prevEpisode", title: "Предыдущая серия" },
];

// Допустимые шаги перемотки: от 3 секунд до 2 минут
export const SEEK_VALUES = [3, 5, 10, 15, 20, 30, 45, 60, 90, 120];

export const DEFAULT_SEEK: PlayerSeekSteps = {
  back: 10,
  forward: 10,
  jump: 90,
};

export const DEFAULT_KEYS: PlayerKeys = {
  togglePlay: "Space",
  back: "ArrowLeft",
  forward: "ArrowRight",
  jump: "Shift+ArrowRight",
  volumeUp: "ArrowUp",
  volumeDown: "ArrowDown",
  mute: "KeyM",
  fullscreen: "KeyF",
  pip: "KeyP",
  nextEpisode: "KeyN",
  prevEpisode: "KeyB",
};

// Читаемое имя клавиши для интерфейса
const KEY_LABELS: Record<string, string> = {
  Space: "Пробел",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Enter: "Enter",
  Escape: "Esc",
  Backspace: "Backspace",
  Tab: "Tab",
  Home: "Home",
  End: "End",
  PageUp: "PgUp",
  PageDown: "PgDn",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

export const formatKey = (combo: string) => {
  if (!combo) return "не назначено";
  const parts = combo.split("+");
  const code = parts.pop() || "";
  const label =
    KEY_LABELS[code] ||
    (code.startsWith("Key") ? code.slice(3) : "") ||
    (code.startsWith("Digit") ? code.slice(5) : "") ||
    code.replace(/^Numpad/, "Num ") ||
    code;
  return [...parts, label].join(" + ");
};

export const formatSeconds = (seconds: number) => {
  const lastTwo = seconds % 100;
  const last = seconds % 10;
  const word =
    last === 1 && lastTwo !== 11 ? "секунда"
    : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? "секунды"
    : "секунд";
  return `${seconds} ${word}`;
};

const clampSeek = (value: unknown, fallback: number) => {
  const step = Number(value);
  if (!Number.isFinite(step)) return fallback;
  if (SEEK_VALUES.includes(step)) return step;
  // Чужое сохранённое значение зажимаем в допустимые рамки
  return Math.min(
    SEEK_VALUES[SEEK_VALUES.length - 1],
    Math.max(SEEK_VALUES[0], Math.round(step))
  );
};

interface userPlayerPreferencesState {
  // id релиза -> имя озвучки, как было выбрано пользователем
  voiceover: Record<number, string>;
  // id релиза -> имя плеера, как было выбрано пользователем
  player: Record<number, string>;
  // Скорость обычного плеера (для встроенных плееров ограничена), 1 по умолчанию
  playbackRate: number;
  // Применять выбранную скорость ко всем тайтлам
  rememberPlaybackRate: boolean;
  // Шаги перемотки кнопками и клавишами, в секундах
  seek: PlayerSeekSteps;
  // Клавиши действий плеера
  keys: PlayerKeys;
  version: number;
  getPreferredVoiceover: (id: number) => string | undefined;
  setPreferredVoiceover: (id: number, voiceover: string) => void;
  getPreferredPlayer: (id: number) => string | undefined;
  setPreferredPlayer: (id: number, player: string) => void;
  setPlaybackRate: (rate: number) => void;
  setRememberPlaybackRate: (remember: boolean) => void;
  setSeek: (kind: keyof PlayerSeekSteps, seconds: number) => void;
  setKey: (action: PlayerAction, combo: string) => void;
  resetKeys: () => void;
  resetAll: () => void;
}

// Обёртка вокруг localStorage: сломанный JSON не должен ломать плеер
const safeStorage = {
  getItem: (name: string) => {
    try {
      const raw = localStorage.getItem(name);
      if (raw == null) return null;
      // Проверяем, что хранилище не испорчено
      JSON.parse(raw);
      return raw;
    } catch {
      try {
        localStorage.removeItem(name);
      } catch {
        /* хранилище недоступно */
      }
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* хранилище недоступно */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* хранилище недоступно */
    }
  },
};

export const useUserPlayerPreferencesStore =
  create<userPlayerPreferencesState>()(
    persist(
      (set, get) => ({
        voiceover: {},
        player: {},
        playbackRate: 1,
        rememberPlaybackRate: true,
        seek: { ...DEFAULT_SEEK },
        keys: { ...DEFAULT_KEYS },
        version: 1,
        getPreferredVoiceover: (id: number) => get().voiceover[id],
        setPreferredVoiceover: (id: number, voiceover: string) => {
          set({
            voiceover: { ...get().voiceover, [id]: voiceover },
          });
        },
        getPreferredPlayer: (id: number) => get().player[id],
        setPreferredPlayer: (id: number, player: string) => {
          set({
            player: { ...get().player, [id]: player },
          });
        },
        setPlaybackRate: (rate: number) => {
          // Допустимая скорость — от 0.25 до 4, чтобы не сорвать поток
          const value = Number(rate);
          if (!Number.isFinite(value) || value <= 0 || value > 4) return;
          set({ playbackRate: value });
        },
        setRememberPlaybackRate: (remember: boolean) => {
          set({ rememberPlaybackRate: remember });
        },
        setSeek: (kind: keyof PlayerSeekSteps, seconds: number) => {
          set({ seek: { ...get().seek, [kind]: clampSeek(seconds, DEFAULT_SEEK[kind]) } });
        },
        setKey: (action: PlayerAction, combo: string) => {
          if (!combo) return;
          const keys = { ...get().keys };
          // Клавиша не должна вызывать два действия: снимаем её с прежнего владельца
          for (const [other, value] of Object.entries(keys)) {
            if (other !== action && value === combo) {
              keys[other as PlayerAction] = "";
            }
          }
          keys[action] = combo;
          set({ keys });
        },
        resetKeys: () => {
          set({ keys: { ...DEFAULT_KEYS } });
        },
        resetAll: () => {
          set({
            voiceover: {},
            player: {},
            playbackRate: 1,
            seek: { ...DEFAULT_SEEK },
            keys: { ...DEFAULT_KEYS },
          });
        },
      }),
      {
        name: "player-preferences",
        storage: createJSONStorage(() => safeStorage),
        merge: (persistedState, currentState) => {
          // Сливаем глубоко, чтобы новые поля не терялись у старых записей
          if (!persistedState || typeof persistedState !== "object") {
            return currentState;
          }
          try {
            const merged = deepmerge(
              currentState as userPlayerPreferencesState,
              persistedState as userPlayerPreferencesState
            );
            if (!merged.voiceover || typeof merged.voiceover !== "object") {
              merged.voiceover = {};
            }
            if (!merged.player || typeof merged.player !== "object") {
              merged.player = {};
            }
            // Шаги и клавиши проверяем поштучно: испорченные значения заменяем умолчаниями
            const seek = (merged.seek || {}) as Partial<PlayerSeekSteps>;
            merged.seek = {
              back: clampSeek(seek.back, DEFAULT_SEEK.back),
              forward: clampSeek(seek.forward, DEFAULT_SEEK.forward),
              jump: clampSeek(seek.jump, DEFAULT_SEEK.jump),
            };
            const keys = (merged.keys || {}) as Partial<PlayerKeys>;
            const cleanKeys = { ...DEFAULT_KEYS };
            for (const action of Object.keys(DEFAULT_KEYS) as PlayerAction[]) {
              const value = keys[action];
              if (typeof value === "string") cleanKeys[action] = value;
            }
            merged.keys = cleanKeys;
            return merged;
          } catch {
            return currentState;
          }
        },
      }
    )
  );

// Действие, назначенное на нажатие
export const keyToAction = (
  keys: PlayerKeys,
  event: KeyboardEvent
): PlayerAction | null => {
  const code = event.code;
  if (!code) return null;
  const withModifiers = [
    event.ctrlKey && "Ctrl",
    event.altKey && "Alt",
    event.shiftKey && "Shift",
    event.metaKey && "Meta",
  ].filter(Boolean) as string[];
  const combo = [...withModifiers, code].join("+");
  for (const [action, value] of Object.entries(keys)) {
    if (value && value === combo) return action as PlayerAction;
  }
  // Shift меняет только регистр символов — для обычных клавиш он не нужен
  if (withModifiers.length === 1 && withModifiers[0] === "Shift") {
    for (const [action, value] of Object.entries(keys)) {
      if (value && value === code) return action as PlayerAction;
    }
  }
  return null;
};
