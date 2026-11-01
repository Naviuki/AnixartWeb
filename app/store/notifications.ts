import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { deepmerge } from "deepmerge-ts";

// Подписка на будущие сезоны конкретного тайтла (или всей франшизы)
export type SeasonSubscription = {
  // Название на момент подписки, чтобы список читался без запросов к API
  title: string;
  // id связанной франшизы, если известен
  relatedId?: number;
  // Время подписки
  since: number;
  // Последнее известное число связанных релизов
  lastRelatedCount: number;
};

export type SeasonNotice = {
  releaseId: number;
  releaseTitle: string;
  title: string;
  relatedId: number;
  releaseType: string;
  status: string;
  date: string;
  poster: string;
  createdAt: number;
};

interface notificationsState {
  // ключ подписки (id релиза или франшизы) -> подписка
  subs: Record<number, SeasonSubscription>;
  // Новые сезоны, найденные при проверке
  notices: SeasonNotice[];
  // Время последней проверки
  lastCheck: number;
  subscribe: (key: number, data: SeasonSubscription) => void;
  unsubscribe: (key: number) => void;
  isSubscribed: (key: number) => boolean;
  addNotices: (items: SeasonNotice[]) => void;
  markRead: () => void;
  hydrate: (subs: Record<number, SeasonSubscription>) => void;
  clearAll: () => void;
}

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

export const useNotificationsStore = create<notificationsState>()(
  persist(
    (set, get) => ({
      subs: {},
      notices: [],
      lastCheck: 0,
      subscribe: (key, data) => {
        set({
          subs: {
            ...get().subs,
            [key]: {
              title: data.title,
              relatedId: data.relatedId,
              since: data.since,
              lastRelatedCount: data.lastRelatedCount,
            },
          },
        });
      },
      unsubscribe: (key) => {
        const next = { ...get().subs };
        delete next[key];
        set({
          subs: next,
          notices: get().notices.filter((item) => item.releaseId !== key),
        });
      },
      isSubscribed: (key) => Boolean(get().subs[key]),
      addNotices: (items) => {
        if (!items.length) return;
        const known = new Set(
          get().notices.map((item) => `${item.releaseId}_${item.relatedId}`)
        );
        const fresh = items.filter(
          (item) => !known.has(`${item.releaseId}_${item.relatedId}`)
        );
        if (!fresh.length) return;
        set({ notices: [...fresh, ...get().notices].slice(0, 100) });
      },
      markRead: () => {
        set({ lastCheck: Date.now() });
      },
      hydrate: (subs) => {
        set({ subs });
      },
      clearAll: () => {
        set({ subs: {}, notices: [], lastCheck: 0 });
      },
    }),
    {
      name: "notifications",
      storage: createJSONStorage(() => safeStorage),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return currentState;
        }
        try {
          const merged = deepmerge(
            currentState as notificationsState,
            persistedState as notificationsState
          );
          if (!merged.subs || typeof merged.subs !== "object") merged.subs = {};
          if (!Array.isArray(merged.notices)) merged.notices = [];
          return merged;
        } catch {
          return currentState;
        }
      },
    }
  )
);
