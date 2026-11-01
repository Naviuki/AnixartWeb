"use client";

// Колокольчик на странице тайтла: подписка на новые сезоны
import { useEffect, useState } from "react";
import { Icon } from "#/components/Icon/Icon";
import { useNotificationsStore } from "#/store/notifications";
import { ENDPOINTS } from "#/api/config";

export const SeasonBell = (props: {
  releaseId: number;
  title: string;
  poster?: string;
}) => {
  const [relatedId, setRelatedId] = useState<number | undefined>(undefined);
  // Обложка нужна списку подписок; если её не передали, берём из карточки релиза
  const [poster, setPoster] = useState<string | undefined>(props.poster);
  // id подписки: тайтл или вся франшиза, если у релиза есть related
  const key = relatedId || props.releaseId;
  const isSubscribed = useNotificationsStore((store) =>
    store.isSubscribed(key)
  );
  // Текущее число связанных релизов читается при подписке, чтобы не подавать старое как новое
  const lastRelatedCount = useNotificationsStore(
    (store) => store.subs[key]?.lastRelatedCount
  );
  const subscribe = useNotificationsStore((store) => store.subscribe);
  const unsubscribe = useNotificationsStore((store) => store.unsubscribe);
  const [initialCount, setInitialCount] = useState<number | null>(null);

  // Франшиза берётся из данных релиза, если она есть
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch(`${ENDPOINTS.release.info}/${props.releaseId}`);
        if (!response.ok) return;
        const data = await response.json();
        const rel = data?.release;
        if (alive && rel?.related?.id) setRelatedId(Number(rel.related.id));
        if (alive && rel?.image && !poster) setPoster(rel.image);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [props.releaseId, poster]);

  // Сколько связанных релизов уже есть: всё, что появится позже, считается новым
  useEffect(() => {
    if (!relatedId) return;
    let alive = true;
    (async () => {
      try {
        const response = await fetch(`${ENDPOINTS.release.related}/${relatedId}/0`);
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data?.content) && alive) {
          setInitialCount(data.content.length);
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [relatedId]);

  // Пока список не загрузился, считаем известным всё, что есть
  const knownForSave =
    initialCount === null ? lastRelatedCount ?? null : initialCount;

  return (
    <button
      type="button"
      className={`btn bell ${isSubscribed ? "g on" : ""}`}
      aria-label={
        isSubscribed ?
          "Уведомления о новых сезонах включены"
        : "Уведомлять о новых сезонах"
      }
      title={
        isSubscribed ?
          "Уведомления о новых сезонах включены"
        : "Уведомлять о новых сезонах"
      }
      onClick={() => {
        if (isSubscribed) {
          unsubscribe(key);
          return;
        }
        subscribe(key, {
          title: props.title,
          poster: poster || props.poster,
          relatedId,
          since: Date.now(),
          // Всё, что есть сейчас, известно; новые релизы появятся позже
          lastRelatedCount:
            typeof knownForSave === "number" ? knownForSave : 0,
        });
      }}
    >
      <Icon name="bell" size={16} />
      <span className="bell-label">
        {isSubscribed ? "Следим за сезоном" : "Уведомлять о сезоне"}
      </span>
    </button>
  );
};
