import { ENDPOINTS } from "#/api/config";
import { tryCatchAPI, unixToDate, useSWRfetcher } from "#/api/utils";
import { useThemeMode } from "flowbite-react";
import { useCallback, useEffect, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { Spinner } from "../Spinner/Spinner";
import { toast } from "react-toastify";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Icon } from "#/components/Icon/Icon";

export const ProfileFriendModal = (props: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  token: string;
  isMyProfile: boolean;
  profile_id: number;
}) => {
  const [currentRef, setCurrentRef] = useState<any>(null);
  const theme = useThemeMode();
  const [actionsDisabled, setActionsDisabled] = useState(false);
  // const [requestInUsers, setRequestInUsers] = useState([]);
  // const [requestOutUsers, setRequestOutUsers] = useState([]);
  const [friends, setFriends] = useState([]);

  const modalRef = useCallback((ref) => {
    setCurrentRef(ref);
  }, []);

  const useFetchRequests = (url: string) => {
    const { data, error, isLoading } = useSWR(url, useSWRfetcher);
    return [data, error, isLoading];
  };

  const [requestInUsersData, requestInUsersError, requestInUsersIsLoading] =
    useFetchRequests(
      props.isMyProfile ?
        `${ENDPOINTS.user.friend.in}/last?token=${props.token}&count=8`
      : ""
    );

  const [requestOutUsersData, requestOutUsersError, requestOutUsersIsLoading] =
    useFetchRequests(
      props.isMyProfile ?
        `${ENDPOINTS.user.friend.out}/last?token=${props.token}&count=8`
      : ""
    );

  async function _hideRequestIn(profile_id) {
    const tid = toast.loading("Скрываем заявку...", {
      position: "bottom-center",
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      theme: theme.mode == "light" ? "light" : "dark",
    });

    let url = `${ENDPOINTS.user.friend.hide}/${profile_id}?token=${props.token}`;
    const { data, error } = await tryCatchAPI(fetch(url));
    if (error) {
      toast.update(tid, {
        render: "Ошибка скрытия заявки",
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      return;
    }

    toast.update(tid, {
      render: "Заявка скрыта",
      type: "success",
      autoClose: 2500,
      isLoading: false,
      closeOnClick: true,
      draggable: true,
    });
    mutate(`${ENDPOINTS.user.friend.in}/last?token=${props.token}&count=8`);
  }

  async function _acceptRequestIn(profile_id) {
    const tid = toast.loading("Принимаем запрос...", {
      position: "bottom-center",
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      theme: theme.mode == "light" ? "light" : "dark",
    });

    let url = `${ENDPOINTS.user.friend.add}/${profile_id}?token=${props.token}`;
    const { data, error } = await tryCatchAPI(fetch(url));
    if (error) {
      toast.update(tid, {
        render: "Ошибка приёма запроса",
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      return;
    }

    toast.update(tid, {
      render: "Запрос принят",
      type: "success",
      autoClose: 2500,
      isLoading: false,
      closeOnClick: true,
      draggable: true,
    });
    mutate(`${ENDPOINTS.user.friend.in}/last?token=${props.token}&count=8`);
  }

  async function _cancelRequestOut(profile_id) {
    const tid = toast.loading("Отменяем запрос...", {
      position: "bottom-center",
      hideProgressBar: true,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      theme: theme.mode == "light" ? "light" : "dark",
    });

    let url = `${ENDPOINTS.user.friend.remove}/${profile_id}?token=${props.token}`;
    const { data, error } = await tryCatchAPI(fetch(url));
    if (error) {
      toast.update(tid, {
        render: "Ошибка отмена запроса",
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      return;
    }

    toast.update(tid, {
      render: "Запрос отменён",
      type: "success",
      autoClose: 2500,
      isLoading: false,
      closeOnClick: true,
      draggable: true,
    });
    mutate(`${ENDPOINTS.user.friend.out}/last?token=${props.token}&count=8`);
  }

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;
    let url = `${ENDPOINTS.user.friend.list}/${props.profile_id}/${pageIndex}?token=${props.token}`;
    return url;
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    useSWRfetcher,
    { initialSize: 2 }
  );

  useEffect(() => {
    if (data) {
      let allFriends = [];
      for (let i = 0; i < data.length; i++) {
        allFriends.push(...data[i].content);
      }
      setFriends(allFriends);
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
          <h3>Друзья</h3>
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
          {props.isMyProfile && (
            <>
              <div className="set-group-t">
                <Icon name="userPlus" size={16} />
                Входящие заявки
              </div>
              {requestInUsersData &&
              requestInUsersData.content &&
              requestInUsersData.content.length > 0 ?
                requestInUsersData.content.map((user) => {
                  return (
                    <div className="row" key={`friend_req_in-${user.id}`}>
                      <Link
                        href={`/profile/${user.id}`}
                        className="friend-tile"
                        style={{ border: "none", background: "transparent" }}
                      >
                        <span className="friend-ava">
                          {user.avatar ?
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatar} alt="" />
                          : user.login[0].toUpperCase()}
                        </span>
                        <span className="row-body">
                          <span className="row-title">{user.login}</span>
                          <span className="row-sub">
                            Друзей: {user.friend_count}
                          </span>
                        </span>
                      </Link>
                      <span className="row-right">
                        <button
                          type="button"
                          className="btn p"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          onClick={() => _acceptRequestIn(user.id)}
                        >
                          Принять
                        </button>
                        <button
                          type="button"
                          className="btn g"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          onClick={() => _hideRequestIn(user.id)}
                        >
                          Скрыть
                        </button>
                      </span>
                    </div>
                  );
                })
              : <p className="muted small">Нет входящих заявок</p>}

              <div className="set-group-t" style={{ marginTop: 6 }}>
                <Icon name="userMinus" size={16} />
                Исходящие заявки
              </div>
              {requestOutUsersData &&
              requestOutUsersData.content &&
              requestOutUsersData.content.length > 0 ?
                requestOutUsersData.content.map((user) => {
                  return (
                    <div className="row" key={`friend_req_out-${user.id}`}>
                      <Link
                        href={`/profile/${user.id}`}
                        className="friend-tile"
                        style={{ border: "none", background: "transparent" }}
                      >
                        <span className="friend-ava">
                          {user.avatar ?
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatar} alt="" />
                          : user.login[0].toUpperCase()}
                        </span>
                        <span className="row-body">
                          <span className="row-title">{user.login}</span>
                          <span className="row-sub">
                            Друзей: {user.friend_count}
                          </span>
                        </span>
                      </Link>
                      <span className="row-right">
                        <button
                          type="button"
                          className="btn g"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          onClick={() => _cancelRequestOut(user.id)}
                        >
                          Отменить
                        </button>
                      </span>
                    </div>
                  );
                })
              : <p className="muted small">Нет исходящих заявок</p>}
            </>
          )}

          <div className="set-group-t" style={{ marginTop: 6 }}>
            <Icon name="users" size={16} />
            Все друзья
          </div>
          {friends && friends.length > 0 ?
            friends.map((user) => {
              return (
                <Link
                  href={`/profile/${user.id}`}
                  className="row"
                  key={`friend-${user.id}`}
                  style={{ marginBottom: 0 }}
                >
                  <span className="friend-ava">
                    {user.avatar ?
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt="" />
                    : user.login[0].toUpperCase()}
                    <i
                      className="friend-dot"
                      style={{
                        background:
                          user.is_online ? "var(--rate-5)" : "var(--t3)",
                      }}
                    />
                  </span>
                  <span className="row-body">
                    <span className="row-title">{user.login}</span>
                    <span className="row-sub">Друзей: {user.friend_count}</span>
                  </span>
                  <span className="row-right">
                    <Icon name="chevron" size={16} />
                  </span>
                </Link>
              );
            })
          : <p className="muted small">Нет друзей</p>}
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
