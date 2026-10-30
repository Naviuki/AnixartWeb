"use client";
import { DEFAULT_APPEARANCE, usePreferencesStore } from "#/store/preferences";
import { Icon } from "#/components/Icon/Icon";

const ACCENTS = [
  "#5b6cff",
  "#9d5cff",
  "#ff4d8d",
  "#22c55e",
  "#f59e0b",
  "#38bdf8",
];

const LAYOUTS: { id: "side" | "rail" | "top" | "dock"; title: string }[] = [
  { id: "side", title: "Сайдбар" },
  { id: "rail", title: "Компактный" },
  { id: "top", title: "Верхняя панель" },
  { id: "dock", title: "Плавающий док" },
];

const CARDS: { id: "overlay" | "below" | "list"; title: string }[] = [
  { id: "overlay", title: "Постер" },
  { id: "below", title: "Постер + подпись" },
  { id: "list", title: "Список" },
];

const THEMES: { id: "dark" | "light" | "amoled"; title: string }[] = [
  { id: "dark", title: "Тёмная" },
  { id: "light", title: "Светлая" },
  { id: "amoled", title: "AMOLED" },
];

const SECTIONS: { id: "hero" | "cont" | "last" | "ong" | "col"; title: string }[] = [
  { id: "hero", title: "Баннер" },
  { id: "cont", title: "Продолжить" },
  { id: "last", title: "Последние" },
  { id: "ong", title: "Выходит" },
  { id: "col", title: "Коллекции" },
];

const NAV_ITEMS: {
  id: "home" | "disc" | "search" | "book" | "fav" | "coll" | "hist";
  title: string;
}[] = [
  { id: "home", title: "Главная" },
  { id: "disc", title: "Обзор" },
  { id: "search", title: "Поиск" },
  { id: "book", title: "Закладки" },
  { id: "fav", title: "Избранное" },
  { id: "coll", title: "Коллекции" },
  { id: "hist", title: "История" },
];

export const AppearancePanel = (props: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}) => {
  const appearance = usePreferencesStore((state) => state.appearance);
  const setAppearance = usePreferencesStore((state) => state.setAppearance);

  const setSection = (id: keyof typeof appearance.sec, value: number) => {
    setAppearance({ sec: { ...appearance.sec, [id]: value } });
  };
  const setNav = (id: keyof typeof appearance.nav, value: number) => {
    setAppearance({ nav: { ...appearance.nav, [id]: value } });
  };

  // Фото уменьшаем до 256px, чтобы dataURL не переполнял localStorage
  const onPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || "");
      const image = new window.Image();
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) {
          setAppearance({ photo: source });
          return;
        }
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(
          image,
          (size - width) / 2,
          (size - height) / 2,
          width,
          height
        );
        setAppearance({ photo: canvas.toDataURL("image/jpeg", 0.85) });
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div
        className={`ap-scrim ${props.isOpen ? "open" : ""}`}
        onClick={() => props.setIsOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`ap ${props.isOpen ? "open" : ""}`}
        aria-label="Настройки вида"
      >
        <div className="mb-head">
          <h3>Вид</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="ap-group">
          <div className="ap-title">Навигация</div>
          <div className="seg">
            {LAYOUTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={appearance.layout === item.id ? "on" : ""}
                onClick={() => setAppearance({ layout: item.id })}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        <div className="ap-group">
          <div className="ap-title">Карточки</div>
          <div className="seg">
            {CARDS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={appearance.card === item.id ? "on" : ""}
                onClick={() => setAppearance({ card: item.id })}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        <div className="ap-group">
          <div className="ap-title">Тема</div>
          <div className="seg">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={appearance.theme === item.id ? "on" : ""}
                onClick={() => setAppearance({ theme: item.id })}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        <div className="ap-group">
          <div className="ap-title">Акцент</div>
          <div className="acc-row">
            {ACCENTS.map((color) => (
              <button
                key={color}
                type="button"
                className={`acc-swatch ${
                  appearance.acc === color ? "on" : ""
                }`}
                style={{ background: color }}
                onClick={() => setAppearance({ acc: color })}
                aria-label={`Акцент ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="ap-group">
          <div className="ap-title">Размеры</div>
          <div className="ap-slider">
            <label htmlFor="ap-r">Скругление</label>
            <input
              id="ap-r"
              type="range"
              min={0}
              max={28}
              value={appearance.r}
              onChange={(event) =>
                setAppearance({ r: Number(event.target.value) })
              }
            />
            <b>{appearance.r} px</b>
          </div>
          <div className="ap-slider">
            <label htmlFor="ap-w">Карточки</label>
            <input
              id="ap-w"
              type="range"
              min={120}
              max={260}
              value={appearance.w}
              onChange={(event) =>
                setAppearance({ w: Number(event.target.value) })
              }
            />
            <b>{appearance.w} px</b>
          </div>
          <div className="ap-slider">
            <label htmlFor="ap-g">Отступы</label>
            <input
              id="ap-g"
              type="range"
              min={4}
              max={28}
              value={appearance.g}
              onChange={(event) =>
                setAppearance({ g: Number(event.target.value) })
              }
            />
            <b>{appearance.g} px</b>
          </div>
        </div>

        <div className="ap-group">
          <div className="ap-title">Секции главной</div>
          {SECTIONS.map((item) => (
            <label key={item.id} className="ap-check">
              <input
                type="checkbox"
                checked={appearance.sec[item.id] === 1}
                onChange={(event) =>
                  setSection(item.id, event.target.checked ? 1 : 0)
                }
              />
              {item.title}
            </label>
          ))}
        </div>

        <div className="ap-group">
          <div className="ap-title">Пункты меню</div>
          {NAV_ITEMS.map((item) => (
            <label key={item.id} className="ap-check">
              <input
                type="checkbox"
                checked={appearance.nav[item.id] === 1}
                onChange={(event) =>
                  setNav(item.id, event.target.checked ? 1 : 0)
                }
              />
              {item.title}
            </label>
          ))}
        </div>

        <div className="ap-group">
          <div className="ap-title">Фото профиля</div>
          <div className="acc-row" style={{ alignItems: "center" }}>
            <label className="btn" style={{ cursor: "pointer" }}>
              <Icon name="photo" size={16} />
              Загрузить
              <input
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
                style={{ display: "none" }}
              />
            </label>
            {appearance.photo && (
              <button
                type="button"
                className="btn g"
                onClick={() => setAppearance({ photo: "" })}
              >
                Убрать
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn"
          style={{ width: "100%" }}
          onClick={() => setAppearance({ ...DEFAULT_APPEARANCE })}
        >
          <Icon name="history" size={16} />
          Сбросить
        </button>
      </aside>
    </>
  );
};
