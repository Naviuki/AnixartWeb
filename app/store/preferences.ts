"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { deepmerge } from "deepmerge-ts";

export type Appearance = {
  layout: "side" | "rail" | "top" | "dock";
  card: "overlay" | "below" | "list";
  theme: "dark" | "light" | "amoled";
  acc: string;
  r: number;
  w: number;
  g: number;
  photo: string;
  sec: {
    hero: number;
    cont: number;
    last: number;
    ong: number;
    col: number;
  };
  nav: {
    home: number;
    disc: number;
    search: number;
    book: number;
    fav: number;
    coll: number;
    hist: number;
  };
};

export const DEFAULT_APPEARANCE: Appearance = {
  layout: "side",
  card: "overlay",
  theme: "dark",
  acc: "#5b6cff",
  r: 14,
  w: 168,
  g: 14,
  photo: "",
  sec: { hero: 1, cont: 1, last: 1, ong: 1, col: 1 },
  nav: { home: 1, disc: 1, search: 1, book: 1, fav: 1, coll: 1, hist: 1 },
};

// Безопасная запись в localStorage: приватный режим и квоты не должны ломать приложение
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
      /* запись недоступна, настройки просто не сохранятся */
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

interface preferencesState {
  _hasHydrated: boolean;
  flags: {
    // saveSearchHistory: boolean;
    saveWatchHistory?: boolean;
    showChangelog?: boolean;
    showFifthButton?: null | string;
  };
  params: {
    isFirstLaunch?: boolean;
    version?: string;
    skipToCategory?: {
      enabled: boolean;
      homeCategory: string;
      bookmarksCategory: string;
    };
    experimental?: {
      newPlayer: boolean;
    };
    // color: {
    //   primary: string;
    //   secondary: string;
    //   accent: string;
    // }
  };
  appearance: Appearance;
  setHasHydrated: (state: boolean) => void;
  setFlags: (flags: preferencesState["flags"]) => void;
  setParams: (params: preferencesState["params"]) => void;
  setAppearance: (patch: Partial<Appearance>) => void;
}

export const usePreferencesStore = create<preferencesState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      flags: {
        saveWatchHistory: true,
        showChangelog: true,
        showFifthButton: "discovery",
      },
      params: {
        isFirstLaunch: true,
        version: "3.0.0",
        skipToCategory: {
          enabled: false,
          homeCategory: "last",
          bookmarksCategory: "watching",
        },
        experimental: {
          newPlayer: false,
        },
      },
      appearance: { ...DEFAULT_APPEARANCE },
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },
      setFlags(flags) {
        set({ flags: { ...get().flags, ...flags } });
      },
      setParams(params) {
        set({ params: { ...get().params, ...params } });
      },
      setAppearance(patch) {
        const current = get().appearance;
        set({
          appearance: {
            ...current,
            ...patch,
            sec: { ...current.sec, ...(patch.sec || {}) },
            nav: { ...current.nav, ...(patch.nav || {}) },
          },
        });
      },
    }),
    {
      name: "preferences",
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: (state) => {
        return () => state.setHasHydrated(true);
      },
      merge: (persistedState, currentState) => {
        return deepmerge(
          currentState as preferencesState,
          persistedState as preferencesState
        );
      },
      version: 2,
    },
  )
);
