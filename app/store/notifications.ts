import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { deepmerge } from "deepmerge-ts";

// Подписка на будущие сезоны конкретного тайтла (или всей франшизы)
export type SeasonSubscription = {
  // Название на момент подписки, чтобы список читался без запросов к API
  title: string;
  // Обложка тайтла для списка подписок
  poster?: string;
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
      const raw = localStorage.getItem(name);
      if (raw == null) return null;
      // Испорченный JSON считается отсутствующим хранилищем
      JSON.parse(raw);
      return raw;
    } catch {
      try {
        localStorage.removeItem(name);
      } catch {
        /* запись недоступна */
      }
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

// Хранилище подписок может содержать записи старого или битого формата:
// такую подписку нельзя показывать, но и падать из-за неё страница не должна
const sanitizeSubs = (
  value: unknown
): Record<number, SeasonSubscription> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<number, SeasonSubscription> = {};
  for (const [key, raw] of Object.entries(value as Record<string, any>)) {
    if (!raw || typeof raw !== "object") continue;
    const since = Number(raw.since);
    if (!Number.isFinite(since)) continue;
    const title =
      typeof raw.title === "string" && raw.title.trim() ?
        raw.title.trim()
      : `Тайтл ${key}`;
    const relatedId = Number(raw.relatedId);
    const count = Number(raw.lastRelatedCount);
    result[Number(key)] = {
      title,
      poster: typeof raw.poster === "string" ? raw.poster : undefined,
      relatedId: Number.isFinite(relatedId) ? relatedId : undefined,
      since,
      lastRelatedCount: Number.isFinite(count) ? count : 0,
    };
  }
  return result;
};

// Дата подписки для списка: битые значения не должны ломать разметку
export const formatSince = (since: number) => {
  const date = new Date(since);
  if (Number.isNaN(date.getTime())) return "дата неизвестна";
  return `С ${date.toLocaleDateString("ru-RU")}`;
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
              poster: data.poster,
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
        if (!Array.isArray(items) || !items.length) return;
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
        set({ subs: sanitizeSubs(subs) });
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
          // Битые и неполные подписки выбрасываются при загрузке хранилища
          merged.subs = sanitizeSubs(merged.subs);
          merged.notices = Array.isArray(merged.notices) ?
            merged.notices.filter((item) => item && typeof item === "object")
          : [];
          merged.lastCheck = Number.isFinite(Number(merged.lastCheck)) ?
            Number(merged.lastCheck)
          : 0;
          return merged;
        } catch {
          return currentState;
        }
      },
    }
  )
);
