"use client";

// Мост между локальными подписками, закладками и профилем аккаунта.
// Запускается один раз на клиенте и только если пользователь включил
// уведомления в настройках.
import { useEffect } from "react";
import { ENDPOINTS } from "#/api/config";
import { useUserStore } from "#/store/auth";
import { usePreferencesStore } from "#/store/preferences";
import { useNotificationsStore, SeasonSubscription } from "#/store/notifications";
import {
  autosubscribeTitles,
  buildRemotePayload,
  pullRemoteSubscriptions,
  shouldCheckNow,
  checkSeasonNotices,
} from "#/components/Notifications/seasonCheck";

type BookmarkItem = { id: number; title_ru?: string; related?: { id?: number } };

async function loadBookmarks(token?: string): Promise<BookmarkItem[]> {
  const urls: string[] = [];
  if (token) {
    urls.push(
      `${ENDPOINTS.user.bookmark}/watching?token=${encodeURIComponent(token)}`,
      `${ENDPOINTS.user.bookmark}/planned?token=${encodeURIComponent(token)}`
    );
  }
  const result: BookmarkItem[] = [];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      const items = Array.isArray(data?.content) ? data.content : [];
      for (const item of items) {
        const release = item?.release || item;
        if (release?.id) {
          result.push({
            id: release.id,
            title_ru: release.title_ru,
            related: release.related,
          });
        }
      }
    } catch {}
  }
  return result;
}

export const NotificationsBridge = () => {
  const token = useUserStore((store) => store.token);
  const isAuth = useUserStore((store) => store.isAuth);
  const autoFavorites = usePreferencesStore(
    (store) => store.autonotify.favorites
  );
  const autoWatched = usePreferencesStore(
    (store) => store.autonotify.watched
  );
  const hydrateRemote = useNotificationsStore((store) => store.hydrate);

  useEffect(() => {
    let alive = true;

    (async () => {
      // 1. Что изменилось на аккаунте с прошлого запуска
      if (isAuth && token) {
        const remote = await pullRemoteSubscriptions(token);
        if (alive && remote?.subs) {
          const local = useNotificationsStore.getState().subs;
          const merged: Record<number, SeasonSubscription> = {
            ...local,
          };
          for (const [key, value] of Object.entries(remote.subs)) {
            if (!merged[Number(key)] && value) {
              merged[Number(key)] = value as SeasonSubscription;
            }
          }
          hydrateRemote(merged);
        }
      }

      // 2. Автоподписка на закладки, если она включена в настройках
      if (autoFavorites || autoWatched) {
        const items = await loadBookmarks(isAuth ? token : undefined);
        if (alive && items.length) {
          await autosubscribeTitles(
            items.map((item) => ({
              id: item.id,
              title: item.title_ru || `Релиз ${item.id}`,
              relatedId: item.related?.id,
            }))
          );
        }
      }

      // 3. Фоновая проверка новых сезонов
      if (alive && shouldCheckNow()) {
        await checkSeasonNotices();
      }

      // 4. Отправка состояния на аккаунт: статус профиля хранит подписки
      if (
        alive &&
        isAuth &&
        token &&
        Object.keys(useNotificationsStore.getState().subs).length
      ) {
        try {
          const status = buildRemotePayload();
          await fetch(
            `${ENDPOINTS.user.settings.status}?token=${encodeURIComponent(token)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json; charset=UTF-8" },
              body: JSON.stringify({ status }),
            }
          );
        } catch {}
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, token, autoFavorites, autoWatched]);

  return null;
};
