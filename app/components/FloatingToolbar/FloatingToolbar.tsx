import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
};

// Плавающая панель действий страницы релиза (поделиться, скачать).
export const FloatingToolbar = ({ children }: Props) => {
  return <div className="ftool">{children}</div>;
};
