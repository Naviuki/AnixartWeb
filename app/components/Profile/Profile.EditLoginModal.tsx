"use client";

import { useThemeMode } from "flowbite-react";
import { ENDPOINTS } from "#/api/config";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { Spinner } from "../Spinner/Spinner";
import { unixToDate } from "#/api/utils";
import { toast } from "react-toastify";
import { tryCatchAPI } from "#/api/utils";
import { useUserStore } from "#/store/auth";
import { Icon } from "#/components/Icon/Icon";

export const ProfileEditLoginModal = (props: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  token: string;
  setLogin: (status: string) => void;
  profile_id: number;
}) => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [_login, _setLogin] = useState("");
  const [_loginData, _setLoginData] = useState({
    code: 0,
    avatar: "",
    login: "",
    is_change_available: false,
    last_change_at: 0,
    next_change_available_at: 0,
  });
  const [_loginLength, _setLoginLength] = useState(0);
  const { mutate } = useSWRConfig();
  const userStore = useUserStore();
  const theme = useThemeMode();

  useEffect(() => {
    async function _fetchLogin() {
      setLoading(true);

      const { data, error } = await tryCatchAPI(
        fetch(`${ENDPOINTS.user.settings.login.info}?token=${props.token}`)
      );

      if (error) {
        toast.error("Ошибка получения текущего никнейма", {
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
        });
        setLoading(false);
        props.setIsOpen(false);
        return;
      }
      _setLoginData(data);
      _setLogin(data.login);
      _setLoginLength(data.login.length);
      setLoading(false);
    }
    _fetchLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isOpen]);

  function handleInput(e: any) {
    _setLogin(e.target.value);
    _setLoginLength(e.target.value.length);
  }

  async function _setLoginSetting() {
    if (!_login || _login == "") {
      toast.error("Никнейм не может быть пустым", {
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      return;
    }

    setSending(true);

    const tid = toast.loading("Обновляем никнейм...", {
      position: "bottom-center",
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      theme: theme.mode == "light" ? "light" : "dark",
    });

    const { data, error } = await tryCatchAPI(
      fetch(
        `${ENDPOINTS.user.settings.login.change}?login=${encodeURIComponent(
          _login
        )}&token=${props.token}`
      )
    );

    if (error) {
      let message = `Ошибка обновления никнейма: ${error.code}`;
      if (error.code == 3) {
        message = "Данный никнейм уже существует, попробуйте другой";
      }
      toast.update(tid, {
        render: message,
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      setSending(false);
      return;
    }

    toast.update(tid, {
      render: "Никнейм обновлён",
      type: "success",
      autoClose: 2500,
      isLoading: false,
      closeOnClick: true,
      draggable: true,
    });

    mutate(
      `${ENDPOINTS.user.profile}/${props.profile_id}?token=${props.token}`
    );
    userStore.checkAuth();
    props.setLogin(_login);
    setSending(false);
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
          <h3>Изменить никнейм</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {loading ?
          <div className="empty" style={{ marginBottom: 0 }}>
            <Spinner />
          </div>
        : <>
            {!_loginData.is_change_available ?
              <div className="banner">
                <span className="banner-ic">
                  <Icon name="clock" size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="banner-t">Вы недавно изменили никнейм</div>
                  <div className="banner-s">
                    следующее изменение будет доступно:{" "}
                    <b style={{ color: "var(--t1)" }}>
                      {unixToDate(_loginData.next_change_available_at, "full")}
                    </b>
                  </div>
                </div>
              </div>
            : <div className="form">
                <textarea
                  disabled={sending}
                  rows={1}
                  id="login"
                  name="login"
                  onChange={(e) => handleInput(e)}
                  value={_login}
                  maxLength={20}
                />
                <p className="hint" style={{ textAlign: "right" }}>
                  {_loginLength}/20
                </p>
              </div>
            }
          </>
        }

        <div className="mb-foot">
          <button
            type="button"
            className="btn g"
            onClick={() => props.setIsOpen(false)}
            disabled={sending || loading}
          >
            Отмена
          </button>
          {_loginData.is_change_available && (
            <button
              type="button"
              className="btn p"
              onClick={() => _setLoginSetting()}
              disabled={sending || loading}
            >
              <Icon name="check" size={16} />
              Сохранить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
