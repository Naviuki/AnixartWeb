"use client";

import { CURRENT_APP_VERSION } from "#/api/config";
import { useUserStore } from "#/store/auth";
import { usePreferencesStore } from "#/store/preferences";
import { useUserPlayerPreferencesStore } from "#/store/player";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "#/components/Icon/Icon";
import { AppearanceControls } from "#/components/Appearance/AppearancePanel";

const HomeCategory = {
  last: "Последние релизы",
  finished: "Завершенные релизы",
  ongoing: "Выходит",
  announce: "Анонсированные релизы",
  films: "Фильмы",
};

const BookmarksCategory = {
  watching: "Смотрю",
  planned: "В планах",
  watched: "Просмотрено",
  delayed: "Отложено",
  abandoned: "Заброшено",
};

const FifthButton = {
  favorites: "Избранное",
  collections: "Коллекции",
  history: "История",
  discovery: "Обзор",
};

type SectionId = "appearance" | "playback" | "notify" | "main" | "account";

const SECTIONS: { id: SectionId; title: string; icon: string }[] = [
  { id: "appearance", title: "Внешний вид", icon: "sparkle" },
  { id: "playback", title: "Плеер", icon: "play" },
  { id: "notify", title: "Уведомления", icon: "bell" },
  { id: "main", title: "Основные", icon: "settings" },
  { id: "account", title: "Аккаунт", icon: "user" },
];

export const SettingsModal = (props: {
  isOpen: boolean;
  setIsOpen: any;
  onOpenAppearance?: () => void;
}) => {
  const preferenceStore = usePreferencesStore();
  const playerStore = useUserPlayerPreferencesStore();
  const userStore = useUserStore();
  const [section, setSection] = useState<SectionId>("appearance");
  const [resetDone, setResetDone] = useState(false);

  // Сброс выполняется целиком: флаг эксперимента и запомненные плееры
  const resetPlayer = () => {
    try {
      window.localStorage.removeItem("anonEpisodesWatched");
    } catch {}
    playerStore.resetAll();
    preferenceStore.resetPlayerPreferences();
    setResetDone(true);
  };

  useEffect(() => {
    if (!props.isOpen) setResetDone(false);
  }, [props.isOpen]);

  if (!props.isOpen) return null;

  const exportablePreferences = () => {
    try {
      return JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          appearance: preferenceStore.appearance,
          flags: preferenceStore.flags,
          params: preferenceStore.params,
        },
        null,
        2
      );
    } catch {
      return "{}";
    }
  };

  const downloadPreferences = () => {
    try {
      const blob = new Blob([exportablePreferences()], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "anix-preferences.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div
      className="md"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) props.setIsOpen(false);
      }}
    >
      <div className="mb set-modal" style={{ width: "min(880px, 100%)" }}>
        <div className="mb-head">
          <h3>Настройки</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="set-layout">
          <nav className="set-nav" aria-label="Разделы настроек">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`set-nav-item ${section === item.id ? "on" : ""}`}
                aria-current={section === item.id ? "true" : undefined}
                onClick={() => setSection(item.id)}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.title}</span>
              </button>
            ))}
          </nav>

          <div className="set-pane">
            {section === "appearance" && (
              <AppearanceControls compact />
            )}

            {section === "playback" && (
              <div className="set-list">
                <div className="set-group">
                  <div className="set-group-t">
                    <Icon name="play" size={18} />
                    Воспроизведение
                  </div>

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">Запоминать скорость</span>
                      <span className="set-s">
                        Скорость из встроенного плеера применяется ко всем
                        тайтлам
                      </span>
                    </span>
                    <label className="check" style={{ marginLeft: "auto" }}>
                      <input
                        type="checkbox"
                        checked={playerStore.rememberPlaybackRate}
                        onChange={(event) =>
                          playerStore.setRememberPlaybackRate(
                            event.target.checked
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">Скорость по умолчанию</span>
                      <span className="set-s">
                        {playerStore.playbackRate}×
                      </span>
                    </span>
                    <select
                      className="set-select"
                      aria-label="Скорость по умолчанию"
                      value={playerStore.playbackRate}
                      onChange={(event) =>
                        playerStore.setPlaybackRate(
                          Number(event.target.value)
                        )
                      }
                    >
                      {[
                        0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5,
                        2.75, 3, 3.25, 3.5, 3.75, 4,
                      ].map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}×
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="set-group">
                  <div className="set-group-t">
                    <Icon name="flame" size={18} />
                    Эксперименты
                  </div>

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">Новый плеер</span>
                      <span className="set-s">
                        Встроенный плеер с выбором скорости. Поддерживаемые
                        источники: Kodik, Sibnet, Libria
                      </span>
                    </span>
                    <label className="check" style={{ marginLeft: "auto" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(
                          preferenceStore.params.experimental?.newPlayer
                        )}
                        onChange={() => {
                          const enabled = Boolean(
                            preferenceStore.params.experimental?.newPlayer
                          );
                          // При выключении запомненные озвучки и плееры не должны мешать обычному плееру
                          if (enabled) {
                            preferenceStore.resetPlayerPreferences();
                          } else {
                            preferenceStore.setParams({
                              experimental: {
                                ...preferenceStore.params.experimental,
                                newPlayer: true,
                              },
                            });
                          }
                        }}
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="set-row"
                    onClick={resetPlayer}
                  >
                    <span className="set-ic">
                      <Icon name="history" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">
                        {resetDone ?
                          "Плеер сброшен"
                        : "Сбросить настройки плеера"}
                      </span>
                      <span className="set-s">
                        Возвращает обычный плеер и забывает выбранные озвучки,
                        плееры и отметки просмотра
                      </span>
                    </span>
                    <Icon name="chevron" size={16} />
                  </button>
                </div>
              </div>
            )}

            {section === "notify" && (
              <div className="set-list">
                <div className="set-group">
                  <div className="set-group-t">
                    <Icon name="bell" size={18} />
                    Уведомления о новых сезонах
                  </div>

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">Для всех тайтлов в закладках</span>
                      <span className="set-s">
                        Следить за связанными анонсами и новыми сезонами
                      </span>
                    </span>
                    <label className="check" style={{ marginLeft: "auto" }}>
                      <input
                        type="checkbox"
                        checked={preferenceStore.autonotify.favorites}
                        onChange={(event) =>
                          preferenceStore.setAutonotify({
                            favorites: event.target.checked,
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">Для всех тайтлов в избранном</span>
                    </span>
                    <label className="check" style={{ marginLeft: "auto" }}>
                      <input
                        type="checkbox"
                        checked={preferenceStore.autonotify.watched}
                        onChange={(event) =>
                          preferenceStore.setAutonotify({
                            watched: event.target.checked,
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">Показывать уведомления браузера</span>
                      <span className="set-s">
                        Разрешение запрашивается только после нажатия кнопки
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn g"
                      style={{ marginLeft: "auto" }}
                      onClick={async () => {
                        try {
                          if ("Notification" in window) {
                            await Notification.requestPermission();
                          }
                        } catch {}
                      }}
                    >
                      Разрешить
                    </button>
                  </div>
                </div>

                <Link
                  href="/notifications"
                  className="set-row"
                  onClick={() => props.setIsOpen(false)}
                >
                  <span className="set-ic">
                    <Icon name="bell" size={18} />
                  </span>
                  <span className="set-body">
                    <span className="set-t">Мои подписки</span>
                    <span className="set-s">
                      Список тайтлов, за которыми следим
                    </span>
                  </span>
                  <Icon name="chevron" size={16} />
                </Link>
              </div>
            )}

            {section === "main" && (
              <div className="set-list">
                <div className="set-group">
                  <div className="set-group-t">
                    <Icon name="settings" size={18} />
                    Приложение
                  </div>

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">
                        Пропускать страницу выбора категорий на страницах
                        Домашняя и Закладки
                      </span>
                    </span>
                    <label className="check" style={{ marginLeft: "auto" }}>
                      <input
                        type="checkbox"
                        onChange={() =>
                          preferenceStore.setParams({
                            skipToCategory: {
                              ...preferenceStore.params.skipToCategory,
                              enabled:
                                !preferenceStore.params.skipToCategory.enabled,
                            },
                          })
                        }
                        checked={preferenceStore.params.skipToCategory.enabled}
                      />
                    </label>
                  </div>

                  {preferenceStore.params.skipToCategory.enabled && (
                    <>
                      <div className="set-row">
                        <span className="set-body">
                          <span className="set-t">
                            Категория домашней страницы
                          </span>
                        </span>
                        <select
                          className="set-select"
                          aria-label="Категория домашней страницы"
                          value={
                            preferenceStore.params.skipToCategory.homeCategory
                          }
                          onChange={(e) =>
                            preferenceStore.setParams({
                              skipToCategory: {
                                ...preferenceStore.params.skipToCategory,
                                homeCategory: e.target.value,
                              },
                            })
                          }
                        >
                          {Object.keys(HomeCategory).map((key) => {
                            return (
                              <option key={key} value={key}>
                                {HomeCategory[key]}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="set-row">
                        <span className="set-body">
                          <span className="set-t">
                            Категория страницы закладок
                          </span>
                        </span>
                        <select
                          className="set-select"
                          aria-label="Категория страницы закладок"
                          value={
                            preferenceStore.params.skipToCategory
                              .bookmarksCategory
                          }
                          onChange={(e) =>
                            preferenceStore.setParams({
                              skipToCategory: {
                                ...preferenceStore.params.skipToCategory,
                                bookmarksCategory: e.target.value,
                              },
                            })
                          }
                        >
                          {Object.keys(BookmarksCategory).map((key) => {
                            return (
                              <option key={key} value={key}>
                                {BookmarksCategory[key]}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">Показывать список изменений</span>
                    </span>
                    <label className="check" style={{ marginLeft: "auto" }}>
                      <input
                        type="checkbox"
                        onChange={() =>
                          preferenceStore.setFlags({
                            showChangelog:
                              !preferenceStore.flags.showChangelog,
                          })
                        }
                        checked={preferenceStore.flags.showChangelog}
                      />
                    </label>
                  </div>

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">Сохранять историю просмотра</span>
                      <span className="set-s">
                        При отключении история не будет сохраняться ни локально,
                        ни на аккаунте
                      </span>
                    </span>
                    <label className="check" style={{ marginLeft: "auto" }}>
                      <input
                        type="checkbox"
                        onChange={() =>
                          preferenceStore.setFlags({
                            saveWatchHistory:
                              !preferenceStore.flags.saveWatchHistory,
                          })
                        }
                        checked={preferenceStore.flags.saveWatchHistory}
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  className="set-row"
                  onClick={downloadPreferences}
                >
                  <span className="set-ic">
                    <Icon name="download" size={18} />
                  </span>
                  <span className="set-body">
                    <span className="set-t">Скачать настройки</span>
                    <span className="set-s">
                      Файл с настройками вида и приложения
                    </span>
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
              </div>
            )}

            {section === "account" && (
              <div className="set-list">
                <div className="set-group">
                  <div className="set-group-t">
                    <Icon name="user" size={18} />
                    Аккаунт
                  </div>

                  <div className="set-row">
                    <span className="set-body">
                      <span className="set-t">
                        {userStore.isAuth ?
                          userStore.user.login
                        : "Вы не вошли"}
                      </span>
                      <span className="set-s">
                        {userStore.isAuth ?
                          "Настройки хранятся в браузере"
                        : "Войдите, чтобы видеть избранное, закладки и историю"}
                      </span>
                    </span>
                  </div>

                  {userStore.isAuth && (
                    <div className="set-row set-row-mob">
                      <span className="set-body">
                        <span className="set-t">Пятый пункт в навигации</span>
                      </span>
                      <select
                        className="set-select"
                        aria-label="Пятый пункт в навигации"
                        value={preferenceStore.flags.showFifthButton || ""}
                        onChange={(e) =>
                          preferenceStore.setFlags({
                            showFifthButton: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Нет</option>
                        {Object.keys(FifthButton).map((key) => {
                          return (
                            <option key={key} value={key}>
                              {FifthButton[key]}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                <Link
                  href={"/about"}
                  className="set-row"
                  onClick={() => props.setIsOpen(false)}
                >
                  <span className="set-ic">
                    <Icon name="info" size={18} />
                  </span>
                  <span className="set-body">
                    <span className="set-t">О приложении</span>
                    <span className="set-s">v{CURRENT_APP_VERSION}</span>
                  </span>
                  <Icon name="chevron" size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
