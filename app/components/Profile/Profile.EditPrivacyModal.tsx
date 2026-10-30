"use client";

import { useThemeMode } from "flowbite-react";
import { ENDPOINTS } from "#/api/config";
import { useState } from "react";
import { toast } from "react-toastify";
import { tryCatchAPI } from "#/api/utils";
import { Icon } from "#/components/Icon/Icon";

export const ProfileEditPrivacyModal = (props: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  token: string;
  setting: string;
  privacySettings: {
    privacy_stats: number;
    privacy_counts: number;
    privacy_social: number;
    privacy_friend_requests: number;
  };
  setPrivacySettings: (privacySettings: any) => void;
}) => {
  const setting_text = {
    privacy_stats: "Кто видит мою статистику, оценки и историю просмотра",
    privacy_counts:
      "Кто видит в профиле мои комментарии, коллекции, видео и друзей",
    privacy_social: "Кто видит в профиле мои социальные сети",
    privacy_friend_requests: "Кто может отправлять мне заявки в друзья",
  };

  const _endpoints = {
    privacy_stats: `${ENDPOINTS.user.settings.privacy.stats}?token=${props.token}`,
    privacy_counts: `${ENDPOINTS.user.settings.privacy.counts}?token=${props.token}`,
    privacy_social: `${ENDPOINTS.user.settings.privacy.socials}?token=${props.token}`,
    privacy_friend_requests: `${ENDPOINTS.user.settings.privacy.friendRequests}?token=${props.token}`,
  };

  const [loading, setLoading] = useState(false);
  const theme = useThemeMode();

  const options =
    props.setting == "privacy_friend_requests" ?
      [
        { value: 0, name: "Все пользователи" },
        { value: 1, name: "Никто" },
      ]
    : [
        { value: 0, name: "Все пользователи" },
        { value: 1, name: "Только друзья" },
        { value: 2, name: "Только я" },
      ];

  async function _setPrivacySetting(el: any) {
    let privacySettings = structuredClone(props.privacySettings);
    setLoading(true);

    const tid = toast.loading("Обновление настроек приватности...", {
      position: "bottom-center",
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      theme: theme.mode == "light" ? "light" : "dark",
    });

    const { data, error } = await tryCatchAPI(
      fetch(_endpoints[props.setting], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permission: el.target.value,
        }),
      })
    );

    if (error) {
      toast.update(tid, {
        render: "Ошибка обновления настроек приватности",
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });

      setLoading(false);
      return;
    }

    toast.update(tid, {
      render: "Настройки приватности обновлены",
      type: "success",
      autoClose: 2500,
      isLoading: false,
      closeOnClick: true,
      draggable: true,
    });

    setLoading(false);
    privacySettings[el.target.name] = el.target.value;
    props.setPrivacySettings(privacySettings);
    props.setIsOpen(false);
  }

  if (!props.isOpen) return <></>;

  return (
    <div className="md" onClick={() => props.setIsOpen(false)}>
      <div
        className="mb"
        style={{ width: "min(520px, 100%)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-head">
          <h3>{setting_text[props.setting]}</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {props.setting != "none" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {options.map((option) => (
              <label
                className={`opt-row ${
                  props.privacySettings[props.setting] == option.value ?
                    "on"
                  : ""
                }`}
                key={`${props.setting}-${option.value}`}
              >
                <input
                  disabled={loading}
                  onChange={(e) => _setPrivacySetting(e)}
                  checked={props.privacySettings[props.setting] == option.value}
                  id={`${props.setting}-${option.value}`}
                  type="radio"
                  value={option.value}
                  name={props.setting}
                />
                {option.name}
                {props.privacySettings[props.setting] == option.value && (
                  <Icon name="check" size={16} className="accent" />
                )}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
