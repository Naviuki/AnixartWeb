"use client";

import { useThemeMode } from "flowbite-react";
import { ENDPOINTS } from "#/api/config";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "react-toastify";
import { tryCatchAPI } from "#/api/utils";
import { useUserStore } from "#/store/auth";
import { Icon } from "#/components/Icon/Icon";

export const ProfileEditStatusModal = (props: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  token: string;
  status: string;
  setStatus: (status: string) => void;
  profile_id: number;
}) => {
  const [loading, setLoading] = useState(false);
  const [_status, _setStatus] = useState("");
  const [_stringLength, _setStringLength] = useState(0);
  const { mutate } = useSWRConfig();
  const theme = useThemeMode();
  const userStore = useUserStore();

  useEffect(() => {
    _setStatus(props.status);
    _setStringLength(props.status.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isOpen]);

  function handleInput(e: any) {
    _setStatus(e.target.value);
    _setStringLength(e.target.value.length);
  }

  async function _setStatusSetting() {
    setLoading(true);

    const tid = toast.loading("Обновление статуса...", {
      position: "bottom-center",
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      theme: theme.mode == "light" ? "light" : "dark",
    });

    const { data, error } = await tryCatchAPI(
      fetch(`${ENDPOINTS.user.settings.status}?token=${props.token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: _status,
        }),
      })
    );

    if (error) {
      toast.update(tid, {
        render: "Ошибка обновления статуса",
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
      render: "Статус обновлён",
      type: "success",
      autoClose: 2500,
      isLoading: false,
      closeOnClick: true,
      draggable: true,
    });

    props.setStatus(_status);
    mutate(
      `${ENDPOINTS.user.profile}/${props.profile_id}?token=${props.token}`
    );
    userStore.checkAuth();
    setLoading(false);
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
          <h3>Изменить статус</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="form">
          <textarea
            disabled={loading}
            rows={3}
            id="status"
            name="status"
            onChange={(e) => handleInput(e)}
            value={_status}
            maxLength={80}
          />
          <p className="hint" style={{ textAlign: "right" }}>
            {_stringLength}/80
          </p>
        </div>

        <div className="mb-foot">
          <button
            type="button"
            className="btn g"
            onClick={() => props.setIsOpen(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn p"
            onClick={() => _setStatusSetting()}
            disabled={loading}
          >
            <Icon name="check" size={16} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
