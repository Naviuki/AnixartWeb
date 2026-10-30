"use client";
import { Navigation } from "#/components/Navigation/Navigation";

// Обёртка для обратной совместимости: старое верхнее меню.
// Вся навигация теперь живёт в компоненте Navigation.
export const NavBarPc = (props: {
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
