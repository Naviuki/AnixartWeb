import { Dropdown, DropdownItem, useThemeMode } from "flowbite-react";
import { ENDPOINTS } from "#/api/config";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";
import { useCallback, useEffect, useState } from "react";
import { tryCatchAPI, useSWRfetcher } from "#/api/utils";
import { toast } from "react-toastify";
import { Icon } from "#/components/Icon/Icon";

const lists = [
  { list: 0, name: "Не смотрю" },
  { list: 1, name: "Смотрю" },
  { list: 2, name: "В планах" },
  { list: 3, name: "Просмотрено" },
  { list: 4, name: "Отложено" },
  { list: 5, name: "Брошено" },
];

const DropdownTheme = {
  floating: {
    target: "flex-1",
  },
};

export const ReleaseInfoUserList = (props: {
  userList: number;
  isFavorite: boolean;
  release_id: number;
  token: string | null;
  setUserList: any;
  setIsFavorite: any;
  collection_count: number;
  profile_id: number | null;
}) => {
  const [AddReleaseToCollectionModalOpen, setAddReleaseToCollectionModalOpen] =
    useState(false);
  const [favButtonDisabled, setFavButtonDisabled] = useState(false);
  const [listEventDisabled, setListEventDisabled] = useState(false);
  const theme = useThemeMode();

  function _addToFavorite() {
    async function _setFav(url: string) {
      setFavButtonDisabled(true);
      const tid = toast.loading(
        !props.isFavorite ?
          "Добавляем в избранное..."
        : "Удаляем из избранное...",
        {
          position: "bottom-center",
          hideProgressBar: true,
          closeOnClick: false,
          pauseOnHover: false,
          draggable: false,
          theme: theme.mode == "light" ? "light" : "dark",
        }
      );
      const { data, error } = await tryCatchAPI(fetch(url));

      if (error) {
        toast.update(tid, {
          render:
            !props.isFavorite ?
              "Ошибка добавления в избранное"
            : "Ошибка удаления из избранного",
          type: "error",
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
        });
        setFavButtonDisabled(false);
        return;
      }

      toast.update(tid, {
        render:
          !props.isFavorite ? "Добавлено в избранное" : "Удалено из избранного",
        type: "success",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });

      props.setIsFavorite(!props.isFavorite);
      setFavButtonDisabled(false);
    }

    if (props.token) {
      let url = `${ENDPOINTS.user.favorite}/add/${props.release_id}?token=${props.token}`;
      if (props.isFavorite) {
        url = `${ENDPOINTS.user.favorite}/delete/${props.release_id}?token=${props.token}`;
      }
      _setFav(url);
    }
  }

  function _addToList(list: number) {
    async function _setList(url: string) {
      setListEventDisabled(true);
      const tid = toast.loading("Добавляем в список...", {
        position: "bottom-center",
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
        theme: theme.mode == "light" ? "light" : "dark",
      });
      const { data, error } = await tryCatchAPI(fetch(url));

      if (error) {
        toast.update(tid, {
          render: `Ошибка добавления в список: ${lists[list].name}`,
          type: "error",
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
        });
        setListEventDisabled(false);
        return;
      }

      toast.update(tid, {
        render: `Добавлено в список: ${lists[list].name}`,
        type: "success",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });

      setListEventDisabled(false);
      props.setUserList(list);
    }

    if (props.token) {
      _setList(
        `${ENDPOINTS.user.bookmark}/add/${list}/${props.release_id}?token=${props.token}`
      );
    }
  }

  return (
    <>
      {props.token ?
        <>
          <Link
            href={`/release/${props.release_id}/collections`}
            className="btn p"
          >
            <Icon name="collection" size={16} />
            Показать в коллекциях
            <span className="badge soft">{props.collection_count}</span>
          </Link>

          <button
            type="button"
            className="btn"
            onClick={() => setAddReleaseToCollectionModalOpen(true)}
          >
            <Icon name="plus" size={16} />
            В коллекцию
          </button>

          <Dropdown
            label={lists[props.userList].name}
            dismissOnClick={true}
            theme={DropdownTheme}
            disabled={listEventDisabled}
            renderTrigger={() => (
              <button type="button" className="btn" disabled={listEventDisabled}>
                <Icon name="bookmark" size={16} />
                {lists[props.userList].name}
              </button>
            )}
          >
            {lists.map((list) => (
              <DropdownItem
                key={list.list}
                onClick={() => _addToList(list.list)}
              >
                {list.name}
              </DropdownItem>
            ))}
          </Dropdown>

          <button
            type="button"
            className={`btn icon-only ${props.isFavorite ? "p" : ""}`}
            onClick={() => _addToFavorite()}
            disabled={favButtonDisabled}
            aria-label={
              props.isFavorite ? "Убрать из избранного" : "Добавить в избранное"
            }
            title={
              props.isFavorite ? "Убрать из избранного" : "Добавить в избранное"
            }
          >
            <Icon name="heart" size={18} />
          </button>
        </>
      : <div className="rhero-note" style={{ margin: 0, maxWidth: 420 }}>
          Войдите что-бы добавить в список, избранное или коллекцию
        </div>
      }

      <AddReleaseToCollectionModal
        isOpen={AddReleaseToCollectionModalOpen}
        setIsOpen={setAddReleaseToCollectionModalOpen}
        release_id={props.release_id}
        token={props.token}
        profile_id={props.profile_id}
      />
    </>
  );
};

const AddReleaseToCollectionModal = (props: {
  isOpen: boolean;
  setIsOpen: (isopen: boolean) => void;
  release_id: number;
  token: string;
  profile_id: number;
}) => {
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (!props.token) return null;
    if (previousPageData && !previousPageData.content.length) return null;
    return `${ENDPOINTS.collection.userCollections}/${props.profile_id}/${pageIndex}?token=${props.token}`;
  };
  const theme = useThemeMode();

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    useSWRfetcher,
    { initialSize: 2 }
  );

  const [currentRef, setCurrentRef] = useState<any>(null);
  const modalRef = useCallback((ref) => {
    setCurrentRef(ref);
  }, []);

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

  function _addToCollection(collection: any) {
    async function _ToCollection(url: string) {
      const tid = toast.loading(
        `Добавление в коллекцию ${collection.title}... `,
        {
          position: "bottom-center",
          hideProgressBar: true,
          closeOnClick: false,
          pauseOnHover: false,
          draggable: false,
          theme: theme.mode == "light" ? "light" : "dark",
        }
      );
      const { data, error } = await tryCatchAPI(fetch(url));

      if (error) {
        let message = `${error.message}, code: ${error.code}`;
        if (error.code == 5) {
          message = "Релиз уже есть в коллекции";
        }
        toast.update(tid, {
          render: message,
          type: "error",
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
          theme: theme.mode == "light" ? "light" : "dark",
        });
        return;
      }

      toast.update(tid, {
        render: "Релиз добавлен в коллекцию",
        type: "success",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
        theme: theme.mode == "light" ? "light" : "dark",
      });
    }

    if (props.token) {
      _ToCollection(
        `${ENDPOINTS.collection.addRelease}/${collection.id}?release_id=${props.release_id}&token=${props.token}`
      );
    }
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
          <h3>Выбор коллекции</h3>
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
            content.map((collection: any) => (
              <button
                type="button"
                className="row"
                key={`collection_${collection.id}`}
                onClick={() => _addToCollection(collection)}
                style={{ width: "100%", textAlign: "left" }}
              >
                <span className="row-poster">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={collection.image} alt="" />
                </span>
                <span className="row-body">
                  <span className="row-title">{collection.title}</span>
                  {collection.description && (
                    <span className="row-sub">{collection.description}</span>
                  )}
                </span>
                <span className="row-right">
                  <Icon name="plus" size={16} />
                </span>
              </button>
            ))
          : <p className="muted small">
              {isLoading ? "Загружаем коллекции..." : "коллекций не найдено"}
            </p>
          }
        </div>
      </div>
    </div>
  );
};
