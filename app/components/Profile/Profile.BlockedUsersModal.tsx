import { ENDPOINTS } from "#/api/config";
import { tryCatchAPI, unixToDate, useSWRfetcher } from "#/api/utils";
import { useThemeMode } from "flowbite-react";
import { useCallback, useEffect, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { Spinner } from "../Spinner/Spinner";
import { toast } from "react-toastify";
import { Icon } from "#/components/Icon/Icon";

export const ProfileBlockedUsersModal = (props: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  token: string;
  profile_id: number;
}) => {
  const [currentRef, setCurrentRef] = useState<any>(null);
  const theme = useThemeMode();
  const [actionsDisabled, setActionsDisabled] = useState(false);
  const [unblockedUsers, setUnblockedUsers] = useState([]);

  const modalRef = useCallback((ref) => {
    setCurrentRef(ref);
  }, []);

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;
    let url = `${ENDPOINTS.user.blocklist}/all/${pageIndex}?token=${props.token}`;
    return url;
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    useSWRfetcher,
    { initialSize: 2 }
  );

  async function _addToBlocklist(profile_id) {
    setActionsDisabled(true);

    const tid = toast.loading(
      unblockedUsers.includes(profile_id) ?
        "Блокируем пользователя..."
      : "Разблокируем пользователя...",
      {
        position: "bottom-center",
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
        theme: theme.mode == "light" ? "light" : "dark",
      }
    );

    let url = `${ENDPOINTS.user.blocklist}`;
    unblockedUsers.includes(profile_id) ?
      (url += "/add/")
    : (url += "/remove/");
    url += `${profile_id}?token=${props.token}`;

    const { data, error } = await tryCatchAPI(fetch(url));
    if (error) {
      toast.update(tid, {
        render:
          unblockedUsers.includes(profile_id) ?
            "Ошибка блокировки"
          : "Ошибка разблокировки",
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      setActionsDisabled(false);
      return;
    }

    toast.update(tid, {
      render:
        unblockedUsers.includes(profile_id) ?
          "Пользователь заблокирован"
        : "Пользователь разблокирован",
      type: "success",
      autoClose: 2500,
      isLoading: false,
      closeOnClick: true,
      draggable: true,
    });

    if (unblockedUsers.includes(profile_id)) {
      setUnblockedUsers((prev) => {
        return prev.filter((item) => item !== profile_id);
      });
    } else {
      setUnblockedUsers((prev) => {
        return [...prev, profile_id];
      });
    }
    setActionsDisabled(false);
  }

  const [content, setContent] = useState([]);
  useEffect(() => {
    if (data) {
      let allReleases = [];
      for (let i = 0; i < data.length; i++) {
        allReleases.push(...data[i].content);
      }
      setContent(allReleases);
    }
  }, [data]);

  const [scrollPosition, setScrollPosition] = useState(0);
  function handleScroll() {
    const height = currentRef.scrollHeight - currentRef.clientHeight;
    const windowScroll = currentRef.scrollTop;
    const scrolled = (windowScroll / height) * 100;
    setScrollPosition(Math.floor(scrolled));
  }

  useEffect(() => {
    if (scrollPosition >= 95 && scrollPosition <= 96) {
      setSize(size + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollPosition]);

  if (!props.isOpen) return <></>;

  return (
    <div className="md" onClick={() => props.setIsOpen(false)}>
      <div
        className="mb"
        onClick={(event) => event.stopPropagation()}
        style={{ width: "min(720px, 100%)" }}
      >
        <div className="mb-head">
          <h3>Заблокированные пользователи</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="mb-list" onScroll={handleScroll} ref={modalRef}>
          {content && content.length > 0 ?
            content.map((user) => {
              return (
                <div className="row" key={`blockeduser-${user.id}`}>
                  <span className="friend-ava">
                    {user.avatar ?
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt="" />
                    : user.login[0].toUpperCase()}
                  </span>
                  <span className="row-body">
                    <span className="row-title">{user.login}</span>
                    <span className="row-sub">
                      Заблокирован: {unixToDate(user.added_date, "full")}
                    </span>
                  </span>
                  <span className="row-right">
                    <button
                      type="button"
                      className={`btn ${
                        !unblockedUsers.includes(user.id) ? "p" : "danger"
                      }`}
                      onClick={() => _addToBlocklist(user.id)}
                      disabled={actionsDisabled}
                      style={{ padding: "5px 10px", fontSize: 12 }}
                    >
                      {!unblockedUsers.includes(user.id) ?
                        "Разблокировать"
                      : "Заблокировать"}
                    </button>
                  </span>
                </div>
              );
            })
          : <p className="muted small">Нет заблокированных пользователей</p>}
          {isLoading && (
            <div className="empty" style={{ marginBottom: 0 }}>
              <Spinner />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
