"use client";

import { CURRENT_APP_VERSION } from "#/api/config";
import { useUserStore } from "#/store/auth";
import { usePreferencesStore } from "#/store/preferences";
import {
  useUserPlayerPreferencesStore,
  PLAYER_ACTIONS,
  SEEK_MAX,
  SEEK_MIN,
  formatKey,
  type PlayerAction,
} from "#/store/player";
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

// Поле шага перемотки: набираем свободно, применяем по Enter или при уходе.
// Иначе зажатое значение из хранилища не даёт стереть цифру и набрать новую.
const SeekField = (props: {
  title: string;
  value: number;
  onCommit: (seconds: number) => void;
}) => {
  const [draft, setDraft] = useState(String(props.value));

  useEffect(() => {
    setDraft(String(props.value));
  }, [props.value]);

  const commit = () => {
    const parsed = Math.round(Number(draft.replace(",", ".")));
    if (!Number.isFinite(parsed)) {
      setDraft(String(props.value));
      return;
    }
    const seconds = Math.min(SEEK_MAX, Math.max(SEEK_MIN, parsed));
    setDraft(String(seconds));
    props.onCommit(seconds);
  };

  return (
    <input
      type="number"
      className="set-input"
      inputMode="numeric"
      aria-label={`${props.title}: шаг в секундах`}
      min={SEEK_MIN}
      max={SEEK_MAX}
      step={1}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
          (event.target as HTMLInputElement).blur();
        }
      }}
    />
  );
};

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
  const [capturing, setCapturing] = useState<PlayerAction | null>(null);

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
    if (!props.isOpen) {
      setResetDone(false);
      setCapturing(null);
    }
  }, [props.isOpen]);

  // Назначение клавиши: пока ждём, перехватываем нажатие целиком, чтобы
  // стрелка не прокрутила модалку, а буква не ушла в поиск страницы
  useEffect(() => {
    if (!capturing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setCapturing(null);
        return;
      }
      // Один модификатор без основной клавиши не назначаем
      if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const combo = [
        event.ctrlKey && "Ctrl",
        event.altKey && "Alt",
        event.shiftKey && "Shift",
        event.metaKey && "Meta",
        event.code,
      ]
        .filter(Boolean)
        .join("+");
      useUserPlayerPreferencesStore.getState().setKey(capturing, combo);
      setCapturing(null);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [capturing]);

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
      className="md" role="dialog" aria-label="Настройки"
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
                        Скорость применяется ко всем тайтлам и обоим плеерам
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
                    <Icon name="clock" size={18} />
                    Перемотка
                  </div>

                  {(
                    [
                      {
                        kind: "back",
                        title: "Назад",
                        hint: "Кнопка и клавиша шага назад",
                      },
                      {
                        kind: "forward",
                        title: "Вперёд",
                        hint: "Кнопка и клавиша шага вперёд",
                      },
                      {
                        kind: "jump",
                        title: "Перемотка опенинга",
                        hint: "Пропуск заставки одним нажатием",
                      },
                    ] as const
                  ).map((item) => (
                    <div className="set-row" key={item.kind}>
                      <span className="set-body">
                        <span className="set-t">{item.title}</span>
                        <span className="set-s">{item.hint}</span>
                      </span>
                      <span className="set-num">
                        <SeekField
                          title={item.title}
                          value={playerStore.seek[item.kind]}
                          onCommit={(seconds) =>
                            playerStore.setSeek(item.kind, seconds)
                          }
                        />
                        с
                      </span>
                    </div>
                  ))}
                  <span className="set-s" style={{ padding: "0 10px" }}>
                    Любая секунда от {SEEK_MIN} до {SEEK_MAX}: например, 85
                  </span>
                </div>

                <div className="set-group">
                  <div className="set-group-t">
                    <Icon name="grid" size={18} />
                    Горячие клавиши
                  </div>

                  <span className="set-s" style={{ padding: "0 10px 4px" }}>
                    Работают, когда курсор над плеером или включён полный экран.
                    Нажмите на клавишу и введите новую.
                  </span>

                  {PLAYER_ACTIONS.map(({ action, title, hint }) => (
                    <div className="set-row" key={action}>
                      <span className="set-body">
                        <span className="set-t">{title}</span>
                        {hint && <span className="set-s">{hint}</span>}
                      </span>
                      <button
                        type="button"
                        className={`set-key ${capturing === action ? "on" : ""}`}
                        aria-label={`Клавиша для действия «${title}»`}
                        onClick={() =>
                          setCapturing(capturing === action ? null : action)
                        }
                      >
                        {capturing === action ?
                          "нажмите клавишу…"
                        : formatKey(playerStore.keys[action])}
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="set-row"
                    onClick={() => {
                      playerStore.resetKeys();
                      setCapturing(null);
                    }}
                  >
                    <span className="set-ic">
                      <Icon name="history" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">Сбросить клавиши</span>
                      <span className="set-s">Вернуть стандартные сочетания</span>
                    </span>
                    <Icon name="chevron" size={16} />
                  </button>

                  <span className="set-s" style={{ padding: "0 10px" }}>
                    Эти же клавиши и шаги перемотки есть в меню плеера —
                    шестерёнка на панели управления
                  </span>
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
