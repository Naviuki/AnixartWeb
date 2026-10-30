"use client";

import { useThemeMode } from "flowbite-react";
import { Spinner } from "../Spinner/Spinner";
import { ENDPOINTS } from "#/api/config";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "react-toastify";
import { tryCatchAPI } from "#/api/utils";
import { Icon } from "#/components/Icon/Icon";

export const ProfileEditSocialModal = (props: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  token: string;
  profile_id: number;
}) => {
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [socials, setSocials] = useState({
    vkPage: "",
    tgPage: "",
    discordPage: "",
    instPage: "",
    ttPage: "",
  });
  const { mutate } = useSWRConfig();
  const theme = useThemeMode();

  function _addUrl(username: string, social: string) {
    if (!username) {
      return "";
    }
    if (username.startsWith("h")) {
      return username;
    }
    switch (social) {
      case "vk":
        return `https://vk.com/${username}`;
      case "tg":
        return `https://t.me/${username}`;
      case "inst":
        return `https://instagram.com/${username}`;
      case "tt":
        return `https://tiktok.com/@${username}`;
    }
  }

  function _removeUrl(link: string) {
    if (link.startsWith("https://")) {
      const split = link.split("/");
      return split[split.length - 1];
    } else {
      return link;
    }
  }

  useEffect(() => {
    async function _fetchSettings() {
      setLoading(true);

      const { data, error } = await tryCatchAPI(
        fetch(`${ENDPOINTS.user.settings.socials.info}?token=${props.token}`)
      );

      if (error) {
        toast.error("Ошибка получения соц. сетей", {
          type: "error",
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
        });

        setLoading(false);
        props.setIsOpen(false);
        return;
      }

      setSocials({
        vkPage: data.vk_page,
        tgPage: data.tg_page,
        discordPage: data.discord_page,
        instPage: data.inst_page,
        ttPage: data.tt_page,
      });
      setLoading(false);
    }
    _fetchSettings();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isOpen]);

  function handleInput(e: any) {
    const social = {
      ...socials,
      [e.target.name]: e.target.value,
    };
    setSocials(social);
  }

  async function _setSocialSetting() {
    const body = {
      vkPage: _removeUrl(socials.vkPage),
      tgPage: _removeUrl(socials.tgPage),
      discordPage: _removeUrl(socials.discordPage),
      instPage: _removeUrl(socials.instPage),
      ttPage: _removeUrl(socials.ttPage),
    };

    setUpdating(true);
    const tid = toast.loading("Обновление соц. сетей...", {
      position: "bottom-center",
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      theme: theme.mode == "light" ? "light" : "dark",
    });

    const { data, error } = await tryCatchAPI(
      fetch(`${ENDPOINTS.user.settings.socials.edit}?token=${props.token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
    );

    if (error) {
      toast.update(tid, {
        render: "Ошибка обновления соц. сетей",
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });

      setUpdating(false);
      return;
    }

    toast.update(tid, {
      render: "Соц. сети обновлены",
      type: "success",
      autoClose: 2500,
      isLoading: false,
      closeOnClick: true,
      draggable: true,
    });

    mutate(
      `${ENDPOINTS.user.profile}/${props.profile_id}?token=${props.token}`
    );
    setUpdating(false);
    props.setIsOpen(false);
  }

  if (!props.isOpen) return <></>;

  return (
    <div className="md" onClick={() => props.setIsOpen(false)}>
      <div
        className="mb"
        style={{ width: "min(560px, 100%)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-head">
          <h3>Соц. сети</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="rhero-note" style={{ margin: "0 0 4px" }}>
          Укажите ссылки на свои социальные сети, чтобы другие пользователи
          могли с вами связаться
        </div>

        {loading ?
          <div className="empty" style={{ marginBottom: 0 }}>
            <Spinner />
          </div>
        : <div className="form">
            <label htmlFor="vk-page">ВКонтакте</label>
            <input
              id="vk-page"
              name="vkPage"
              onChange={(e) => handleInput(e)}
              value={_addUrl(socials.vkPage, "vk")}
              placeholder="Ссылка или никнейм"
            />

            <label htmlFor="tg-page">Telegram</label>
            <input
              id="tg-page"
              name="tgPage"
              onChange={(e) => handleInput(e)}
              value={_addUrl(socials.tgPage, "tg")}
              placeholder="Ссылка или никнейм"
            />

            <label htmlFor="discord-page">Discord</label>
            <input
              id="discord-page"
              name="discordPage"
              onChange={(e) => handleInput(e)}
              value={socials.discordPage}
              placeholder="Никнейм"
            />

            <label htmlFor="inst-page">Instagram</label>
            <input
              id="inst-page"
              name="instPage"
              onChange={(e) => handleInput(e)}
              value={_addUrl(socials.instPage, "inst")}
              placeholder="Ссылка или никнейм"
            />

            <label htmlFor="tt-page">TikTok</label>
            <input
              id="tt-page"
              name="ttPage"
              onChange={(e) => handleInput(e)}
              value={_addUrl(socials.ttPage, "tt")}
              placeholder="Ссылка или никнейм"
            />
          </div>
        }

        <div className="mb-foot">
          <button
            type="button"
            className="btn g"
            onClick={() => props.setIsOpen(false)}
            disabled={updating}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn p"
            onClick={() => _setSocialSetting()}
            disabled={updating}
          >
            <Icon name="check" size={16} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
