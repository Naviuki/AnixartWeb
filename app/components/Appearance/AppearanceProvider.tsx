"use client";
import { useEffect } from "react";
import { useThemeMode } from "flowbite-react";
import { usePreferencesStore } from "#/store/preferences";
import { accentInk, accentText } from "#/api/contrast";

// Фон темы, на котором лежит акцентный текст
const THEME_BG: Record<string, string> = {
  dark: "#11131b",
  light: "#ffffff",
  amoled: "#0b0b0d",
};

// Применяет настройки внешнего вида к <body>: тема, каркас, карточки и переменные.
export const AppearanceProvider = (props: { children: React.ReactNode }) => {
  const appearance = usePreferencesStore((state) => state.appearance);
  const { setMode } = useThemeMode();

  useEffect(() => {
    const body = document.body;
    body.dataset.layout = appearance.layout;
    body.dataset.card = appearance.card;
    body.dataset.theme = appearance.theme;
    body.style.setProperty("--acc", appearance.acc);
    // Цвет текста на акцентной подложке считается от самого акцента,
    // иначе на светлом акценте белый текст не читается
    body.style.setProperty("--acc-ink", accentInk(appearance.acc));
    // Акцентный текст на фоне темы: тот же оттенок, но не ниже AA
    body.style.setProperty(
      "--acc-text",
      accentText(appearance.acc, THEME_BG[appearance.theme] || THEME_BG.dark)
    );
    body.style.setProperty("--r", `${appearance.r}px`);
    body.style.setProperty("--cw", `${appearance.w}px`);
    body.style.setProperty("--gap", `${appearance.g}px`);

    // amoled это тёмная тема плюс отдельные токены
    setMode(appearance.theme === "light" ? "light" : "dark");
  }, [appearance, setMode]);

  return <>{props.children}</>;
};
