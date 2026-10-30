"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useUserStore } from "#/store/auth";
import { usePreferencesStore } from "#/store/preferences";
import { Icon } from "#/components/Icon/Icon";

type NavId = "home" | "disc" | "search" | "book" | "fav" | "coll" | "hist";

const NAV_ITEMS: {
  id: NavId;
  icon: string;
  title: string;
  href: string;
  auth: boolean;
}[] = [
  { id: "home", icon: "home", title: "Главная", href: "/", auth: false },
  {
    id: "disc",
    icon: "compass",
    title: "Обзор",
    href: "/discovery",
    auth: false,
  },
  { id: "search", icon: "search", title: "Поиск", href: "/search", auth: false },
  {
    id: "book",
    icon: "bookmark",
    title: "Закладки",
    href: "/bookmarks",
    auth: true,
  },
  { id: "fav", icon: "heart", title: "Избранное", href: "/favorites", auth: true },
  {
    id: "coll",
    icon: "collection",
    title: "Коллекции",
    href: "/collections",
    auth: true,
  },
  { id: "hist", icon: "history", title: "История", href: "/history", auth: true },
];

// Раздел-родитель для подсветки активного пункта
const sectionOf = (pathname: string): NavId | null => {
  if (!pathname) return "home";
  if (
    pathname === "/" ||
    pathname.startsWith("/home") ||
    pathname.startsWith("/release") ||
    pathname.startsWith("/related")
  )
    return "home";
  if (pathname.startsWith("/discovery")) return "disc";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/bookmarks")) return "book";
  if (pathname.startsWith("/favorites")) return "fav";
  if (pathname.startsWith("/collection")) return "coll";
  if (pathname.startsWith("/history")) return "hist";
  if (pathname.startsWith("/profile") && pathname.includes("/bookmarks"))
    return "book";
  return null;
};

const ALL_PAGES = [
  { icon: "home", title: "Главная", href: "/" },
  { icon: "compass", title: "Обзор", href: "/discovery" },
  { icon: "search", title: "Поиск", href: "/search" },
  { icon: "bookmark", title: "Закладки", href: "/bookmarks" },
  { icon: "heart", title: "Избранное", href: "/favorites" },
  { icon: "collection", title: "Коллекции", href: "/collections" },
  { icon: "plus", title: "Новая коллекция", href: "/collections/create" },
  { icon: "history", title: "История", href: "/history" },
  { icon: "user", title: "Профиль", href: "/profile" },
  { icon: "login", title: "Вход", href: "/login" },
  { icon: "info", title: "О приложении", href: "/about" },
];

export const Navigation = (props: {
  setIsSettingModalOpen: (value: boolean) => void;
  onOpenAppearance: () => void;
}) => {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const isAuth = useUserStore((state) => state.isAuth);
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const appearance = usePreferencesStore((state) => state.appearance);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const active = sectionOf(pathname);
  const photo = appearance.photo || (isAuth && user?.avatar) || "";
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;
  const profileHref = isAuth && user?.id ? `/profile/${user.id}` : loginHref;

  const items = NAV_ITEMS.filter((item) => {
    if (item.auth && !isAuth) return false;
    return appearance.nav[item.id] === 1;
  });

  const pages = ALL_PAGES.map((page) =>
    page.href === "/profile" ? { ...page, href: profileHref } : page
  );

  return (
    <>
      <nav className="nav" aria-label="Основное меню">
        <Link href={profileHref} className="nav-user">
          <span className="nav-ava">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" />
            ) : (
              "А"
            )}
          </span>
          <span className="nav-name">{isAuth ? user?.login : "Аноним"}</span>
        </Link>

        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`nav-item ${active === item.id ? "active" : ""}`}
          >
            <Icon name={item.icon} size={20} />
            <span className="nav-label">{item.title}</span>
          </Link>
        ))}

        <div className="nav-spacer" />

        <button
          type="button"
          className="nav-item"
          onClick={() => setPagesOpen(true)}
        >
          <Icon name="layers" size={20} />
          <span className="nav-label">Все страницы</span>
        </button>
        <button
          type="button"
          className="nav-item"
          onClick={() => props.onOpenAppearance()}
        >
          <Icon name="sparkle" size={20} />
          <span className="nav-label">Вид</span>
        </button>
        <button
          type="button"
          className="nav-item"
          onClick={() => props.setIsSettingModalOpen(true)}
        >
          <Icon name="settings" size={20} />
          <span className="nav-label">Настройки</span>
        </button>
        {isAuth ? (
          <button type="button" className="nav-item" onClick={() => logout()}>
            <Icon name="logout" size={20} />
            <span className="nav-label">Выйти</span>
          </button>
        ) : (
          <button
            type="button"
            className="nav-item"
            onClick={() => router.push(loginHref)}
          >
            <Icon name="login" size={20} />
            <span className="nav-label">Войти</span>
          </button>
        )}
      </nav>

      <nav className="mnav" aria-label="Мобильное меню">
        {items
          .filter((item) => ["home", "disc", "search", "book"].includes(item.id))
          .map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`mnav-item ${active === item.id ? "active" : ""}`}
            >
              <Icon name={item.icon} size={22} />
              <span>{item.title}</span>
            </Link>
          ))}
        <button
          type="button"
          className={`mnav-item ${moreOpen ? "active" : ""}`}
          onClick={() => setMoreOpen(true)}
          aria-label="Ещё"
        >
          <span className="mnav-ava">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" />
            ) : (
              "А"
            )}
          </span>
          <span>Ещё</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="md" onClick={() => setMoreOpen(false)}>
          <div
            className="mb"
            style={{ width: "min(420px, 100%)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-head">
              <h3>Меню</h3>
              <button
                type="button"
                className="mb-close"
                onClick={() => setMoreOpen(false)}
                aria-label="Закрыть"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="mb-list">
              <Link
                href={profileHref}
                className="row"
                onClick={() => setMoreOpen(false)}
              >
                <span className="nav-ava" style={{ width: 34, height: 34 }}>
                  <Icon name="user" size={18} />
                </span>
                <span className="row-body">
                  <span className="row-title">
                    {isAuth && user?.login ? user.login : "Профиль"}
                  </span>
                </span>
                <span className="row-right">
                  <Icon name="chevron" size={16} />
                </span>
              </Link>

              <button
                type="button"
                className="row"
                onClick={() => {
                  setMoreOpen(false);
                  setPagesOpen(true);
                }}
              >
                <span className="nav-ava" style={{ width: 34, height: 34 }}>
                  <Icon name="layers" size={18} />
                </span>
                <span className="row-body">
                  <span className="row-title">Все страницы</span>
                </span>
                <span className="row-right">
                  <Icon name="chevron" size={16} />
                </span>
              </button>

              <button
                type="button"
                className="row"
                onClick={() => {
                  setMoreOpen(false);
                  props.onOpenAppearance();
                }}
              >
                <span className="nav-ava" style={{ width: 34, height: 34 }}>
                  <Icon name="sparkle" size={18} />
                </span>
                <span className="row-body">
                  <span className="row-title">Вид</span>
                </span>
                <span className="row-right">
                  <Icon name="chevron" size={16} />
                </span>
              </button>

              <button
                type="button"
                className="row"
                onClick={() => {
                  setMoreOpen(false);
                  props.setIsSettingModalOpen(true);
                }}
              >
                <span className="nav-ava" style={{ width: 34, height: 34 }}>
                  <Icon name="settings" size={18} />
                </span>
                <span className="row-body">
                  <span className="row-title">Настройки</span>
                </span>
                <span className="row-right">
                  <Icon name="chevron" size={16} />
                </span>
              </button>

              {isAuth ? (
                <button
                  type="button"
                  className="row"
                  onClick={() => {
                    setMoreOpen(false);
                    logout();
                  }}
                >
                  <span className="nav-ava" style={{ width: 34, height: 34 }}>
                    <Icon name="logout" size={18} />
                  </span>
                  <span className="row-body">
                    <span className="row-title">Выйти</span>
                  </span>
                </button>
              ) : (
                <Link
                  href={loginHref}
                  className="row"
                  onClick={() => setMoreOpen(false)}
                >
                  <span className="nav-ava" style={{ width: 34, height: 34 }}>
                    <Icon name="login" size={18} />
                  </span>
                  <span className="row-body">
                    <span className="row-title">Войти</span>
                  </span>
                  <span className="row-right">
                    <Icon name="chevron" size={16} />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {pagesOpen && (
        <div className="md" onClick={() => setPagesOpen(false)}>
          <div
            className="mb"
            style={{ width: "min(560px, 100%)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-head">
              <h3>Все страницы</h3>
              <button
                type="button"
                className="mb-close"
                onClick={() => setPagesOpen(false)}
                aria-label="Закрыть"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <div>
              {pages.map((page) => (
                <Link
                  key={page.href + page.title}
                  href={page.href}
                  className="row"
                  onClick={() => setPagesOpen(false)}
                >
                  <span className="nav-ava" style={{ width: 34, height: 34 }}>
                    <Icon name={page.icon} size={18} />
                  </span>
                  <span className="row-body">
                    <span className="row-title">{page.title}</span>
                  </span>
                  <span className="row-right">
                    <Icon name="chevron" size={16} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
