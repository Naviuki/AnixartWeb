// Проверка новых сезонов у тайтлов, за которыми следит пользователь.
// Работает в браузере: запросы идут через встроенный прокси сайта,
// а для авторизованного пользователя синхронизируется в его профиле.
import { ENDPOINTS } from "#/api/config";
import {
  SeasonNotice,
  useNotificationsStore,
} from "#/store/notifications";

const MIN_CHECK_INTERVAL = 1000 * 60 * 60 * 6; // не чаще раза в 6 часов
const MAX_SUBSCRIPTIONS = 60;
const REMOTE_KEY = "anix_seasons_v1";

export type RelatedItem = {
  id: number;
  title_ru?: string;
  title_original?: string;
  image?: string;
  category?: { name?: string };
  status?: { name?: string };
  release_date?: string;
  season?: number;
};

export async function fetchRelated(
  releaseId: number
): Promise<RelatedItem[] | null> {
  try {
    const response = await fetch(`${ENDPOINTS.release.related}/${releaseId}/0`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data?.content)) return null;
    return data.content.filter((item: any) => item && item.id);
  } catch {
    return null;
  }
}

// Сериалы франшизы: новые сезоны и полнометражные продолжения
export function serials(related: RelatedItem[]) {
  return related.filter((item) => {
    const category = (item.category?.name || "").toLowerCase();
    return category.includes("сериал");
  });
}

type RemoteState = {
  version: 1;
  updated_at: string;
  subs: Record<string, unknown>;
};

// Синхронизация на аккаунте: статус профиля читается только владельцем
export async function pullRemoteSubscriptions(token?: string) {
  if (!token) return null;
  try {
    const response = await fetch(
      `${ENDPOINTS.user.profile}?token=${encodeURIComponent(token)}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const user = data?.profile || data?.user || data;
    const raw = user?.status;
    if (typeof raw !== "string" || !raw.startsWith(REMOTE_KEY)) return null;
    const payload = JSON.parse(raw.slice(REMOTE_KEY.length).trim());
    if (!payload?.subs || typeof payload.subs !== "object") return null;
    return payload as RemoteState;
  } catch {
    return null;
  }
}

export function buildRemotePayload() {
  const { subs } = useNotificationsStore.getState();
  return (
    REMOTE_KEY +
    " " +
    JSON.stringify({
      version: 1,
      updated_at: new Date().toISOString(),
      subs,
    } as RemoteState)
  );
}

export async function checkSeasonNotices(): Promise<SeasonNotice[]> {
  const store = useNotificationsStore.getState();
  const subs = Object.entries(store.subs).slice(0, MAX_SUBSCRIPTIONS);
  if (!subs.length) return [];

  const found: SeasonNotice[] = [];

  for (const [releaseIdRaw, sub] of subs) {
    const releaseId = Number(releaseIdRaw);
    // Связанные релизы берутся по франшизе, если она известна, иначе по самому тайтлу
    const related = await fetchRelated(sub.relatedId || releaseId);
    if (!related) continue;

    const items = serials(related);
    // Без сохранённого значения считаем всю текущую франшизу уже известной
    const known = sub.lastRelatedCount;
    if (typeof known !== "number") {
      store.subscribe(releaseId, {
        title: sub.title,
        relatedId: sub.relatedId,
        since: sub.since,
        lastRelatedCount: items.length,
      });
      continue;
    }

    if (items.length <= known) continue;

    // Новые сериалы считаются от конца списка: он отсортирован по дате
    const fresh = items.slice(known);
    store.subscribe(releaseId, {
      title: sub.title,
      relatedId: sub.relatedId,
      since: sub.since,
      lastRelatedCount: items.length,
    });

    for (const item of fresh) {
      found.push({
        releaseId,
        releaseTitle: sub.title,
        title: item.title_ru || `Релиз ${item.id}`,
        relatedId: item.id,
        releaseType: item.category?.name || "Сериал",
        status: item.status?.name || "",
        date: item.release_date || "",
        poster: item.image || "",
        createdAt: Date.now(),
      });
    }
  }

  store.addNotices(found);
  return found;
}

// Автоподписка для закладок и избранного, включается только в настройках
export async function autosubscribeTitles(
  items: { id: number; title: string; relatedId?: number }[]
) {
  const store = useNotificationsStore.getState();
  let changed = false;
  for (const item of items.slice(0, MAX_SUBSCRIPTIONS)) {
    // Ключ тот же, что у колокольчика: франшиза, если она известна
    const key = item.relatedId || item.id;
    if (store.subs[key]) continue;

    // Количество сериалов на момент подписки
    const related = await fetchRelated(item.relatedId || item.id);
    const count = related ? serials(related).length : 0;

    store.subscribe(key, {
      title: item.title,
      relatedId: item.relatedId,
      since: Date.now(),
      lastRelatedCount: count,
    });
    changed = true;
  }
  return changed;
}

export function shouldCheckNow() {
  const { lastCheck, subs } = useNotificationsStore.getState();
  if (!Object.keys(subs).length) return false;
  return Date.now() - (lastCheck || 0) > MIN_CHECK_INTERVAL;
}

// Отладочная точка для ручной проверки, видна в консоли браузера
if (typeof window !== "undefined") {
  (window as any).__anixCheckSeasons = checkSeasonNotices;
}
