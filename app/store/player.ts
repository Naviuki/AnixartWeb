"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { deepmerge } from "deepmerge-ts";

interface userPlayerPreferencesState {
  // id релиза -> имя озвучки, как было выбрано пользователем
  voiceover: Record<number, string>;
  // id релиза -> имя плеера, как было выбрано пользователем
  player: Record<number, string>;
  // Скорость обычного плеера (для встроенных плееров ограничена), 1 по умолчанию
  playbackRate: number;
  // Применять выбранную скорость ко всем тайтлам
  rememberPlaybackRate: boolean;
  version: number;
  getPreferredVoiceover: (id: number) => string | undefined;
  setPreferredVoiceover: (id: number, voiceover: string) => void;
  getPreferredPlayer: (id: number) => string | undefined;
  setPreferredPlayer: (id: number, player: string) => void;
  setPlaybackRate: (rate: number) => void;
  setRememberPlaybackRate: (remember: boolean) => void;
  resetAll: () => void;
}

// Хранилище может быть недоступно (приватный режим, квоты)
const safeStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* запись недоступна */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* запись недоступна */
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
          set({ playbackRate: rate });
        },
        setRememberPlaybackRate: (remember: boolean) => {
          set({ rememberPlaybackRate: remember });
        },
        resetAll: () => {
          set({ voiceover: {}, player: {}, playbackRate: 1 });
        },
      }),
      {
        name: "player-preferences",
        storage: createJSONStorage(() => safeStorage),
        merge: (persistedState, currentState) => {
          // Старый формат без версии мог содержать битые ключи
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
            return merged;
          } catch {
            return currentState;
          }
        },
      }
    )
  );
