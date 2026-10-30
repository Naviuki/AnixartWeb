"use client";

import { useThemeMode } from "flowbite-react";
import { Spinner } from "../Spinner/Spinner";
import useSWR from "swr";
import { ENDPOINTS } from "#/api/config";
import { useEffect, useState } from "react";
import { b64toBlob, tryCatchAPI, unixToDate, useSWRfetcher } from "#/api/utils";
import { ProfileEditPrivacyModal } from "./Profile.EditPrivacyModal";
import { ProfileEditStatusModal } from "./Profile.EditStatusModal";
import { ProfileEditSocialModal } from "./Profile.EditSocialModal";
import { CropModal } from "../CropModal/CropModal";
import { useSWRConfig } from "swr";
import { useUserStore } from "#/store/auth";
import { ProfileEditLoginModal } from "./Profile.EditLoginModal";
import { toast } from "react-toastify";
import { ProfileBlockedUsersModal } from "./Profile.BlockedUsersModal";
import { Icon } from "#/components/Icon/Icon";

export const ProfileEditModal = (props: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  token: string;
  profile_id: number;
}) => {
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [privacyModalSetting, setPrivacyModalSetting] = useState("none");
  const [privacySettings, setPrivacySettings] = useState({
    privacy_stats: 9,
    privacy_counts: 9,
    privacy_social: 9,
    privacy_friend_requests: 9,
  });
  const [socialBounds, setSocialBounds] = useState({
    vk: false,
    google: false,
  });
  const [status, setStatus] = useState("");
  const [login, setLogin] = useState("");
  const { mutate } = useSWRConfig();
  const userStore = useUserStore();
  const theme = useThemeMode();

  const [avatarModalProps, setAvatarModalProps] = useState({
    isOpen: false,
    isActionsDisabled: false,
    selectedImage: null,
    croppedImage: null,
  });

  const privacy_stat_act_social_text = {
    0: "Все пользователи",
    1: "Только друзья",
    2: "Только я",
    9: "Неизвестно",
  };
  const privacy_friend_req_text = {
    0: "Все пользователи",
    1: "Никто",
    9: "Неизвестно",
  };

  function useFetchInfo(url: string) {
    if (!props.token) {
      url = "";
    }

    const { data, isLoading, error } = useSWR(url, useSWRfetcher);
    return [data, isLoading, error];
  }

  const [prefData, prefLoading, prefError] = useFetchInfo(
    `${ENDPOINTS.user.settings.my}?token=${props.token}`
  );
  const [loginData, loginLoading, loginError] = useFetchInfo(
    `${ENDPOINTS.user.settings.login.info}?token=${props.token}`
  );

  const handleAvatarPreview = (e: any) => {
    const file = e.target.files[0];
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      const content = fileReader.result;
      setAvatarModalProps({
        ...avatarModalProps,
        isOpen: true,
        selectedImage: content,
      });
      e.target.value = "";
    };
    fileReader.readAsDataURL(file);
  };

  useEffect(() => {
    if (prefData) {
      setPrivacySettings({
        privacy_stats: prefData.privacy_stats,
        privacy_counts: prefData.privacy_counts,
        privacy_social: prefData.privacy_social,
        privacy_friend_requests: prefData.privacy_friend_requests,
      });
      setSocialBounds({
        vk: prefData.is_vk_bound || prefData.isVkBound || false,
        google: prefData.is_google_bound || prefData.isGoogleBound || false,
      });
      setStatus(prefData.status);
    }
  }, [prefData]);

  useEffect(() => {
    if (loginData) {
      setLogin(loginData.login);
    }
  }, [loginData]);

  useEffect(() => {
    async function _uploadAvatar() {
      let block = avatarModalProps.croppedImage.split(";");
      let contentType = block[0].split(":")[1];
      let realData = block[1].split(",")[1];
      const blob = b64toBlob(realData, contentType);

      const formData = new FormData();
      formData.append("image", blob, "cropped.jpg");
      formData.append("name", "image");

      setAvatarModalProps(
        (state) => (state = { ...state, isActionsDisabled: true })
      );

      const tid = toast.loading("Обновление аватара...", {
        position: "bottom-center",
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
        theme: theme.mode == "light" ? "light" : "dark",
      });

      const { data, error } = await tryCatchAPI(
        fetch(`${ENDPOINTS.user.settings.avatar}?token=${props.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: formData,
        })
      );

      if (error) {
        toast.update(tid, {
          render: "Ошибка обновления аватара",
          type: "error",
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
        });
        setAvatarModalProps(
          (state) => (state = { ...state, isActionsDisabled: false })
        );
        return;
      }

      toast.update(tid, {
        render: "Аватар обновлён",
        type: "success",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      setAvatarModalProps(
        (state) =>
          (state = {
            isOpen: false,
            isActionsDisabled: false,
            selectedImage: null,
            croppedImage: null,
          })
      );
      mutate(
        `${ENDPOINTS.user.profile}/${props.profile_id}?token=${props.token}`
      );
      userStore.checkAuth();
    }

    if (avatarModalProps.croppedImage) {
      _uploadAvatar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarModalProps.croppedImage]);

  if (!prefData || !loginData || prefError || loginError) {
    return <></>;
  }

  return (
    <>
      {props.isOpen && (
        <div className="md" onClick={() => props.setIsOpen(false)}>
          <div
            className="mb"
            style={{ width: "min(640px, 100%)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-head">
              <h3>Редактирование профиля</h3>
              <button
                type="button"
                className="mb-close"
                onClick={() => props.setIsOpen(false)}
                aria-label="Закрыть"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {prefLoading ?
              <div className="empty" style={{ marginBottom: 0 }}>
                <Spinner />
              </div>
            : <div className="mb-list">
                <div className="set-group">
                  <div className="set-group-t">
                    <Icon name="user" size={18} />
                    Профиль
                  </div>

                  <label
                    htmlFor="dropzone-file"
                    className={`set-row ${
                      prefData.is_change_avatar_banned ? "disabled" : ""
                    }`}
                  >
                    <span className="set-ic">
                      <Icon name="photo" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">Изменить фото профиля</span>
                      <span className="set-s">
                        {prefData.is_change_avatar_banned ?
                          `Заблокировано до ${unixToDate(
                            prefData.ban_change_avatar_expires,
                            "full"
                          )}`
                        : "Загрузить с устройства"}
                      </span>
                    </span>
                    <input
                      id="dropzone-file"
                      type="file"
                      className="hidden"
                      accept="image/jpg, image/jpeg, image/png"
                      disabled={prefData.is_change_avatar_banned}
                      onChange={(e) => {
                        handleAvatarPreview(e);
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    className="set-row"
                    onClick={() => {
                      setStatusModalOpen(true);
                    }}
                  >
                    <span className="set-ic">
                      <Icon name="edit" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">Изменить статус</span>
                      <span className="set-s" style={{ whiteSpace: "pre-wrap" }}>
                        {status}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`set-row ${
                      prefData.is_change_login_banned ? "disabled" : ""
                    }`}
                    disabled={prefData.is_change_login_banned}
                    onClick={() => {
                      setLoginModalOpen(true);
                    }}
                  >
                    <span className="set-ic">
                      <Icon name="user" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">Изменить никнейм</span>
                      <span className="set-s">
                        {prefData.is_change_login_banned ?
                          `Заблокировано до ${unixToDate(
                            prefData.ban_change_login_expires,
                            "full"
                          )}`
                        : login}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="set-row"
                    onClick={() => {
                      setSocialModalOpen(true);
                    }}
                  >
                    <span className="set-ic">
                      <Icon name="link" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">Мои социальные сети</span>
                      <span className="set-s">
                        укажите ссылки на свои страницы в соц. сетях
                      </span>
                    </span>
                  </button>
                </div>

                <div className="set-group">
                  <div className="set-group-t">
                    <Icon name="lock" size={18} />
                    Приватность
                  </div>

                  <button
                    type="button"
                    className="set-row"
                    onClick={() => {
                      setPrivacyModalOpen(true);
                      setPrivacyModalSetting("privacy_stats");
                    }}
                  >
                    <span className="set-ic">
                      <Icon name="eye" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">
                        Кто видит мою статистику, оценки и историю просмотра
                      </span>
                      <span className="set-s">
                        {
                          privacy_stat_act_social_text[
                            privacySettings.privacy_stats
                          ]
                        }
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="set-row"
                    onClick={() => {
                      setPrivacyModalOpen(true);
                      setPrivacyModalSetting("privacy_counts");
                    }}
                  >
                    <span className="set-ic">
                      <Icon name="eye" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">
                        Кто видит в профиле мои комментарии, коллекции, видео и
                        друзей
                      </span>
                      <span className="set-s">
                        {
                          privacy_stat_act_social_text[
                            privacySettings.privacy_counts
                          ]
                        }
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="set-row"
                    onClick={() => {
                      setPrivacyModalOpen(true);
                      setPrivacyModalSetting("privacy_social");
                    }}
                  >
                    <span className="set-ic">
                      <Icon name="link" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">
                        Кто видит в профиле мои социальные сети
                      </span>
                      <span className="set-s">
                        {
                          privacy_stat_act_social_text[
                            privacySettings.privacy_social
                          ]
                        }
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="set-row"
                    onClick={() => {
                      setPrivacyModalOpen(true);
                      setPrivacyModalSetting("privacy_friend_requests");
                    }}
                  >
                    <span className="set-ic">
                      <Icon name="users" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">
                        Кто может отправлять мне заявки в друзья
                      </span>
                      <span className="set-s">
                        {
                          privacy_friend_req_text[
                            privacySettings.privacy_friend_requests
                          ]
                        }
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="set-row"
                    onClick={() => {
                      setBlockedModalOpen(true);
                    }}
                  >
                    <span className="set-ic">
                      <Icon name="ban" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">Блоклист</span>
                      <span className="set-s">
                        Список пользователей, которым запрещён доступ к вашей
                        странице
                      </span>
                    </span>
                  </button>
                </div>

                <div className="set-group">
                  <div className="set-group-t">
                    <Icon name="link" size={18} />
                    Привязка к сервисам
                  </div>
                  <div className="set-row disabled">
                    <span className="set-ic">
                      <Icon name="info" size={18} />
                    </span>
                    <span className="set-body">
                      <span className="set-t">Связанные аккаунты</span>
                      <span className="set-s">
                        {socialBounds.vk || socialBounds.google ?
                          "Аккаунт привязан к:"
                        : "не привязан к сервисам"}{" "}
                        {socialBounds.vk && "ВК"}
                        {socialBounds.vk && socialBounds.google && ", "}
                        {socialBounds.google && "Google"}
                      </span>
                      <span className="set-s">
                        Недоступно для изменения в данном клиенте
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      )}
      {props.token ?
        <>
          <ProfileEditPrivacyModal
            isOpen={privacyModalOpen}
            setIsOpen={setPrivacyModalOpen}
            token={props.token}
            setting={privacyModalSetting}
            privacySettings={privacySettings}
            setPrivacySettings={setPrivacySettings}
          />
          <ProfileEditStatusModal
            isOpen={statusModalOpen}
            setIsOpen={setStatusModalOpen}
            token={props.token}
            status={status}
            setStatus={setStatus}
            profile_id={props.profile_id}
          />
          <ProfileEditSocialModal
            isOpen={socialModalOpen}
            setIsOpen={setSocialModalOpen}
            token={props.token}
            profile_id={props.profile_id}
          />
          <CropModal
            {...avatarModalProps}
            cropParams={{
              aspectRatio: 1 / 1,
              forceAspect: true,
              guides: true,
              width: 600,
              height: 600,
            }}
            setCropModalProps={setAvatarModalProps}
          />
          <ProfileEditLoginModal
            isOpen={loginModalOpen}
            setIsOpen={setLoginModalOpen}
            token={props.token}
            setLogin={setLogin}
            profile_id={props.profile_id}
          />
          <ProfileBlockedUsersModal
            isOpen={blockedModalOpen}
            setIsOpen={setBlockedModalOpen}
            token={props.token}
            profile_id={props.profile_id}
          />
        </>
      : ""}
    </>
  );
};
