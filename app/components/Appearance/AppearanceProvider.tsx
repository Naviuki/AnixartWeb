"use client";
import { useEffect } from "react";
import { useThemeMode } from "flowbite-react";
import { usePreferencesStore } from "#/store/preferences";

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
    body.style.setProperty("--r", `${appearance.r}px`);
    body.style.setProperty("--cw", `${appearance.w}px`);
    body.style.setProperty("--gap", `${appearance.g}px`);

    // amoled это тёмная тема плюс отдельные токены
    setMode(appearance.theme === "light" ? "light" : "dark");
  }, [appearance, setMode]);

  return <>{props.children}</>;
};
