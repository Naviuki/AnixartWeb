"use client";
import { useThemeMode } from "flowbite-react";
import { useState } from "react";
import { useUserStore } from "#/store/auth";
import { ENDPOINTS } from "#/api/config";
import { useRouter } from "next/navigation";
import { tryCatchAPI } from "#/api/utils";
import { toast } from "react-toastify";
import { Icon } from "#/components/Icon/Icon";

export const CollectionInfoControls = (props: {
  isFavorite: boolean;
  id: number;
  authorId: number;
  isPrivate: boolean;
}) => {
  const [isFavorite, setIsFavorite] = useState(props.isFavorite);
  const [isUpdating, setIsUpdating] = useState(false);
  const theme = useThemeMode();

  const userStore = useUserStore();
  const router = useRouter();

  async function _addToFavorite() {
    async function _FavCol(url: string) {
      setIsUpdating(true);
      const tid = toast.loading(
        isFavorite ?
          "Удаляем коллекцию из избранного..."
        : "Добавляем коллекцию в избранное...",
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
            isFavorite ?
              "Ошибка удаления коллекции из избранного"
            : "Ошибка добавления коллекции в избранное",
          type: "error",
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
        });
        setIsUpdating(false);
        return;
      }

      toast.update(tid, {
        render:
          isFavorite ?
            "Коллекция удалена из избранного"
          : "Коллекция добавлена в избранное",
        type: "success",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });

      setIsUpdating(false);
      setIsFavorite(!isFavorite);
    }

    if (userStore.token) {
      let url = `${ENDPOINTS.collection.favoriteCollections}/add/${props.id}?token=${userStore.token}`;
      if (isFavorite) {
        url = `${ENDPOINTS.collection.favoriteCollections}/delete/${props.id}?token=${userStore.token}`;
      }
      _FavCol(url);
    }
  }

  async function _deleteCollection() {
    async function _DelCol(url: string) {
      setIsUpdating(true);
      const tid = toast.loading("Удаляем коллекцию...", {
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
          render: "Ошибка удаления коллекции",
          type: "error",
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
        });
        setIsUpdating(false);
        return;
      }

      toast.update(tid, {
        render: `Коллекция удалена`,
        type: "success",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });

      setIsUpdating(false);
      router.push("/collections");
    }

    if (userStore.token) {
      _DelCol(
        `${ENDPOINTS.collection.delete}/${props.id}?token=${userStore.token}`
      );
    }
  }

  return (
    <section className="box collview-controls">
      <button
        type="button"
        className={`btn ${isFavorite ? "g" : "p"}`}
        onClick={() => _addToFavorite()}
        disabled={isUpdating}
      >
        <Icon name="heart" size={16} fill={isFavorite} />
        {!isFavorite ? "Добавить в избранное" : "Убрать из избранного"}
      </button>

      {props.isPrivate && (
        <p className="hint" style={{ marginTop: 10 }}>
          Это приватная коллекция, доступ к ней имеете только вы
        </p>
      )}

      {userStore.user && userStore.user.id == props.authorId && (
        <div className="collview-actions">
          <button
            type="button"
            className="btn g"
            onClick={() =>
              router.push("/collections/create?mode=edit&id=" + props.id)
            }
            disabled={isUpdating}
          >
            <Icon name="edit" size={16} />
            Редактировать
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => _deleteCollection()}
            disabled={isUpdating}
          >
            <Icon name="trash" size={16} />
            Удалить
          </button>
        </div>
      )}
    </section>
  );
};
