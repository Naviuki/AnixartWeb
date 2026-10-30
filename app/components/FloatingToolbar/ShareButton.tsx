"use client";

import { SHARE_PREFIX } from "#/api/config";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import { Icon } from "#/components/Icon/Icon";

type ShareButtonProps = {
  text: string;
};

export const ShareButton = ({ text }: ShareButtonProps) => {
  const pathname = usePathname();

  function copyShareLink() {
    const url = `${SHARE_PREFIX}${pathname}`;
    if (navigator.share) {
      navigator
        .share({ text, url })
        .then(() => toast.success("Ссылка скопирована"))
        .catch((error) => toast.error("Действие отменено"));
    } else if (navigator.clipboard) {
      navigator.clipboard
        .writeText(`${text} ${url}`)
        .then(() => {
          toast.success("Ссылка скопирована");
        })
        .catch((error) => toast.error("Не удалось скопировать ссылку"));
    } else {
      toast.error("Действие не поддерживается вашим браузером");
    }
  }

  return (
    <button
      type="button"
      className="btn icon-only"
      onClick={copyShareLink}
      aria-label="Поделиться"
      title="Поделиться"
    >
      <Icon name="share" size={18} />
    </button>
  );
};
