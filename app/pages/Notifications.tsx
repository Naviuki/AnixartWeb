"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "#/components/PageHead/PageHead";
import { Icon } from "#/components/Icon/Icon";
import { useNotificationsStore } from "#/store/notifications";
import {
  checkSeasonNotices,
  shouldCheckNow,
} from "#/components/Notifications/seasonCheck";

export const NotificationsPage = () => {
  const subs = useNotificationsStore((store) => store.subs);
  const notices = useNotificationsStore((store) => store.notices);
  const unsubscribe = useNotificationsStore((store) => store.unsubscribe);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const list = Object.entries(subs).sort((a, b) => b[1].since - a[1].since);

  async function check(manual: boolean) {
    setChecking(true);
    setMessage("");
    const found = await checkSeasonNotices();
    if (manual) {
      setMessage(
        found.length ?
          `Найдено новых сезонов: ${found.length}`
        : "Пока новых сезонов нет"
      );
    }
    setChecking(false);
  }

  // Фоновая проверка не чаще раза в 6 часов
  useEffect(() => {
    if (shouldCheckNow()) check(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMessage("");
    const timer = window.setTimeout(() => setMessage(""), 9000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <>
      <PageHead
        title="Уведомления"
        subtitle="Новые сезоны тайтлов, за которыми вы следите"
      />

      <div className="row" style={{ alignItems: "flex-start", gap: 15 }}>
        <span className="nav-ava" style={{ width: 38, height: 38 }}>
          <Icon name="bell" size={18} />
        </span>
        <div className="row-body">
          <span className="row-title">{list.length} подписок</span>
          <span className="row-sub">
            Проверка идёт в браузере: связанные анонсы и релизы тайтла
            просматриваются через прокси сайта
          </span>
        </div>
        <button
          type="button"
          className="btn"
          disabled={checking || !list.length}
          onClick={() => check(true)}
        >
          <Icon name="refresh" size={16} />
          {checking ? "Проверяем" : "Проверить"}
        </button>
      </div>

      {message && <p className="hint">{message}</p>}

      {notices.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2>Новые сезоны</h2>
          </div>
          <div className="mb-list">
            {notices.map((item) => (
              <Link
                key={`${item.releaseId}_${item.relatedId}`}
                href={`/release/${item.relatedId}`}
                className="row"
              >
                <span className="row-body">
                  <span className="row-title">{item.title}</span>
                  <span className="row-sub">
                    {item.releaseType} · {item.status}
                    {item.date ? ` · ${item.date}` : ""}
                  </span>
                </span>
                <span className="badge soft">Новое</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec-head">
          <h2>Вы следите</h2>
        </div>
        {list.length === 0 ?
          <div className="empty">
            <Icon name="bell" size={22} />
            <p>Пока нет подписок</p>
            <p className="muted">
              Подписаться можно кнопкой «Уведомлять о сезоне» на странице
              тайтла
            </p>
          </div>
        : <div className="mb-list">
            {list.map(([id, sub]) => (
              <div key={id} className="row">
                <Link href={`/release/${sub.relatedId || id}`} className="row-body">
                  <span className="row-title">{sub.title}</span>
                  <span className="row-sub">
                    С {new Date(sub.since).toLocaleDateString("ru-RU")}
                  </span>
                </Link>
                <Link
                  href={`/related/${sub.relatedId || id}`}
                  className="btn g related-btn"
                >
                  <Icon name="layers" size={14} />
                  Франшиза
                </Link>
                <button
                  type="button"
                  className="btn g"
                  onClick={() => unsubscribe(Number(id))}
                >
                  <Icon name="x" size={14} />
                  Отписаться
                </button>
              </div>
            ))}
          </div>}
      </section>
    </>
  );
};
