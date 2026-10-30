"use client";

import { CURRENT_APP_VERSION } from "#/api/config";
import { useUserStore } from "#/store/auth";
import { usePreferencesStore } from "#/store/preferences";
import { useThemeMode } from "flowbite-react";
import Link from "next/link";
import { Icon } from "#/components/Icon/Icon";

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

export const SettingsModal = (props: {
  isOpen: boolean;
  setIsOpen: any;
  onOpenAppearance?: () => void;
}) => {
  const preferenceStore = usePreferencesStore();
  const userStore = useUserStore();

  const { computedMode, setMode } = useThemeMode();

  if (!props.isOpen) return null;

  return (
    <div
      className="md"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) props.setIsOpen(false);
      }}
    >
      <div className="mb" style={{ width: "min(580px, 100%)" }}>
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

        <div className="set-list">
          {props.onOpenAppearance && (
            <button
              type="button"
              className="set-row"
              onClick={() => props.onOpenAppearance && props.onOpenAppearance()}
            >
              <span className="set-ic">
                <Icon name="sparkle" size={18} />
              </span>
              <span className="set-body">
                <span className="set-t">Открыть панель «Вид»</span>
                <span className="set-s">
                  Тема, акцент, каркас, карточки и секции главной
                </span>
              </span>
              <Icon name="chevron" size={16} />
            </button>
          )}

          <div className="set-group">
            <div className="set-group-t">
              <Icon name="sparkle" size={18} />
              Интерфейс
            </div>

            <div className="set-row">
              <span className="set-body">
                <span className="set-t">Тема</span>
              </span>
              <div className="seg">
                <button
                  type="button"
                  className={computedMode == "light" ? "on" : ""}
                  onClick={() => setMode("light")}
                >
                  Светлая
                </button>
                <button
                  type="button"
                  className={computedMode == "dark" ? "on" : ""}
                  onClick={() => setMode("dark")}
                >
                  Тёмная
                </button>
              </div>
            </div>

            <div className="set-row">
              <span className="set-body">
                <span className="set-t">
                  Пропускать страницу выбора категорий на страницах Домашняя и
                  Закладки
                </span>
              </span>
              <label className="check" style={{ marginLeft: "auto" }}>
                <input
                  type="checkbox"
                  onChange={() =>
                    preferenceStore.setParams({
                      skipToCategory: {
                        ...preferenceStore.params.skipToCategory,
                        enabled: !preferenceStore.params.skipToCategory.enabled,
                      },
                    })
                  }
                  checked={preferenceStore.params.skipToCategory.enabled}
                />
              </label>
            </div>

            {preferenceStore.params.skipToCategory.enabled ?
              <>
                <div className="set-row">
                  <span className="set-body">
                    <span className="set-t">Категория домашней страницы</span>
                  </span>
                  <select
                    className="set-select"
                    aria-label="Категория домашней страницы"
                    value={preferenceStore.params.skipToCategory.homeCategory}
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
                    <span className="set-t">Категория страницы закладок</span>
                  </span>
                  <select
                    className="set-select"
                    aria-label="Категория страницы закладок"
                    value={
                      preferenceStore.params.skipToCategory.bookmarksCategory
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
            : ""}

            {userStore.isAuth ?
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
            : ""}
          </div>

          <div className="set-group">
            <div className="set-group-t">
              <Icon name="settings" size={18} />
              Приложение
            </div>

            <div className="set-row">
              <span className="set-body">
                <span className="set-t">Показывать список изменений</span>
              </span>
              <label className="check" style={{ marginLeft: "auto" }}>
                <input
                  type="checkbox"
                  onChange={() =>
                    preferenceStore.setFlags({
                      showChangelog: !preferenceStore.flags.showChangelog,
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
                  При отключении, история не будет сохранятся как локально, так и
                  на аккаунте
                </span>
              </span>
              <label className="check" style={{ marginLeft: "auto" }}>
                <input
                  type="checkbox"
                  onChange={() =>
                    preferenceStore.setFlags({
                      saveWatchHistory: !preferenceStore.flags.saveWatchHistory,
                    })
                  }
                  checked={preferenceStore.flags.saveWatchHistory}
                />
              </label>
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
                  Поддерживаемые источники: Kodik, Sibnet, Libria
                </span>
              </span>
              <label className="check" style={{ marginLeft: "auto" }}>
                <input
                  type="checkbox"
                  onChange={() =>
                    preferenceStore.setParams({
                      experimental: {
                        ...preferenceStore.params.experimental,
                        newPlayer:
                          !preferenceStore.params.experimental.newPlayer,
                      },
                    })
                  }
                  checked={preferenceStore.params.experimental.newPlayer}
                />
              </label>
            </div>
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
      </div>
    </div>
  );
};
