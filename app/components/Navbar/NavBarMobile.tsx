"use client";
import { Navigation } from "#/components/Navigation/Navigation";

// Обёртка для обратной совместимости: старое нижнее меню.
// Вся навигация теперь живёт в компоненте Navigation.
export const NavBarMobile = (props: {
  setIsSettingModalOpen: any;
  onOpenAppearance?: () => void;
}) => {
  return (
    <Navigation
      setIsSettingModalOpen={props.setIsSettingModalOpen}
      onOpenAppearance={props.onOpenAppearance || (() => {})}
    />
  );
};
