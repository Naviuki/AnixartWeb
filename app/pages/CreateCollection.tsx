"use client";
import useSWRInfinite from "swr/infinite";
import { useUserStore } from "#/store/auth";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ENDPOINTS } from "#/api/config";
import { useThemeMode } from "flowbite-react";
import { PosterWithStuff } from "#/components/ReleasePoster/PosterWithStuff";
import { CropModal } from "#/components/CropModal/CropModal";
import { b64toBlob, tryCatchAPI } from "#/api/utils";

import { Spinner } from "#/components/Spinner/Spinner";
import { toast } from "react-toastify";
import { PageHead } from "#/components/PageHead/PageHead";
import { Icon } from "#/components/Icon/Icon";

const postFetcher = async (url: string, payload: string) => {
  const { data, error } = await tryCatchAPI(
    fetch(url, {
      method: "POST",
      headers: {
        "Api-Version": "v2",
        "Content-Type": "application/json",
      },
      body: payload,
    })
  );

  if (error) {
    throw error;
  }
  return data;
};

export const CreateCollectionPage = () => {
  const userStore = useUserStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const theme = useThemeMode();

  useEffect(() => {
    if (userStore.state === "finished" && !userStore.token) {
      router.push("/login?redirect=/collections/create");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore]);

  const [edit, setEdit] = useState(false);

  const [isPrivate, setIsPrivate] = useState(false);
  const [collectionInfo, setCollectionInfo] = useState({
    title: "",
    description: "",
  });
  const [stringLength, setStringLength] = useState({
    title: 0,
    description: 0,
  });
  const [addedReleases, setAddedReleases] = useState([]);
  const [addedReleasesIds, setAddedReleasesIds] = useState([]);
  const [releasesEditModalOpen, setReleasesEditModalOpen] = useState(false);

  const [imageModalProps, setImageModalProps] = useState({
    isOpen: false,
    isActionsDisabled: false,
    selectedImage: null,
    croppedImage: null,
  });
  const [imageUrl, setImageUrl] = useState<string>(null);

  const collection_id = searchParams.get("id") || null;
  const mode = searchParams.get("mode") || null;

  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function _checkMode() {
      if (mode === "edit" && collection_id) {
        setIsSending(true);
        const res = await fetch(
          `${ENDPOINTS.collection.base}/${collection_id}?token=${userStore.token}`
        );
        const data = await res.json();

        let addedReleasesIdsArray = [];
        let addedReleasesArray = [];

        for (let i = 0; i < 4; i++) {
          const res = await fetch(
            `${ENDPOINTS.collection.base}/${collection_id}/releases/${i}?token=${userStore.token}`
          );
          const data = await res.json();

          if (data.content.length > 0) {
            data.content.forEach((release) => {
              if (!addedReleasesIds.includes(release.id)) {
                addedReleasesIdsArray.push(release.id);
                addedReleasesArray.push(release);
              }
            });
          } else {
            setAddedReleases(addedReleasesArray);
            setAddedReleasesIds(addedReleasesIdsArray);
            break;
          }
        }

        if (
          mode === "edit" &&
          userStore.user.id == data.collection.creator.id
        ) {
          setEdit(true);

          setCollectionInfo({
            title: data.collection.title,
            description: data.collection.description,
          });
          setStringLength({
            title: data.collection.title.length,
            description: data.collection.description.length,
          });

          setIsPrivate(data.collection.is_private);
          setImageUrl(data.collection.image);

          setIsSending(false);
        }
      }
    }
    if (userStore.user) {
      _checkMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore.user]);

  useEffect(() => {
    if (imageModalProps.croppedImage) {
      setImageUrl(imageModalProps.croppedImage);
      setImageModalProps({
        isOpen: false,
        isActionsDisabled: false,
        selectedImage: null,
        croppedImage: null,
      });
    }
  }, [imageModalProps.croppedImage]);

  const handleImagePreview = (e: any) => {
    const file = e.target.files[0];
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      const content = fileReader.result;
      setImageModalProps({
        ...imageModalProps,
        isOpen: true,
        selectedImage: content,
      });
      e.target.value = "";
    };
    fileReader.readAsDataURL(file);
  };

  function handleInput(e) {
    const regex = /[^a-zA-Zа-яА-Я0-9_.,:()!? \[\]]/g;
    setCollectionInfo({
      ...collectionInfo,
      [e.target.name]: e.target.value.replace(regex, ""),
    });
    setStringLength({
      ...stringLength,
      [e.target.name]: e.target.value.replace(regex, "").length,
    });
  }

  function submit(e) {
    e.preventDefault();

    async function _createCollection() {
      setIsSending(true);
      const tid = toast.loading(
        mode === "edit" ? "Редактируем коллекцию..." : "Создаём коллекцию...",
        {
          position: "bottom-center",
          hideProgressBar: true,
          closeOnClick: false,
          pauseOnHover: false,
          draggable: false,
          theme: theme.mode == "light" ? "light" : "dark",
        }
      );
      const url =
        mode === "edit" ?
          `${ENDPOINTS.collection.edit}/${collection_id}?token=${userStore.token}`
        : `${ENDPOINTS.collection.create}?token=${userStore.token}`;

      const { data, error } = await tryCatchAPI(
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...collectionInfo,
            is_private: isPrivate,
            private: isPrivate,
            releases: addedReleasesIds,
          }),
        })
      );

      if (error) {
        let message = `${error.message}, code: ${error.code}`;
        if (error.code == 5) {
          message =
            "Вы превысили допустимый еженедельный лимит создания коллекций";
        }
        toast.update(tid, {
          render: message,
          type: "error",
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
        });
        setIsSending(false);
        return;
      }

      if (imageUrl && !imageUrl.startsWith("http")) {
        let block = imageUrl.split(";");
        let contentType = block[0].split(":")[1];
        let realData = block[1].split(",")[1];
        const blob = b64toBlob(realData, contentType);

        const formData = new FormData();
        formData.append("image", blob, "cropped.jpg");
        formData.append("name", "image");

        const tiid = toast.loading(
          `Обновление обложки коллекции ${collectionInfo.title}...`,
          {
            position: "bottom-center",
            hideProgressBar: true,
            closeOnClick: false,
            pauseOnHover: false,
            draggable: false,
            theme: theme.mode == "light" ? "light" : "dark",
          }
        );

        const { data: imageData, error } = await tryCatchAPI(
          fetch(
            `${ENDPOINTS.collection.editImage}/${data.collection.id}?token=${userStore.token}`,
            {
              method: "POST",
              body: formData,
            }
          )
        );

        if (error) {
          toast.update(tiid, {
            render: "Не удалось обновить постер коллекции",
            type: "error",
            autoClose: 2500,
            isLoading: false,
            closeOnClick: true,
            draggable: true,
          });
        } else {
          toast.update(tiid, {
            render: "Постер коллекции обновлён",
            type: "success",
            autoClose: 2500,
            isLoading: false,
            closeOnClick: true,
            draggable: true,
          });
        }
      }

      toast.update(tid, {
        render:
          mode === "edit" ?
            `Коллекция ${collectionInfo.title} обновлена`
          : `Коллекция ${collectionInfo.title} создана`,
        type: "success",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      router.push(`/collection/${data.collection.id}`);
      setIsSending(false);
    }

    if (collectionInfo.title.length < 10) {
      toast.error("Необходимо ввести название коллекции не менее 10 символов", {
        position: "bottom-center",
        hideProgressBar: true,
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      return;
    }

    if (addedReleasesIds.length < 1) {
      toast.error("Необходимо добавить хотя бы один релиз в коллекцию", {
        position: "bottom-center",
        hideProgressBar: true,
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      return;
    }

    _createCollection();
  }

  function _deleteRelease(release: any) {
    let releasesArray = [];
    let idsArray = [];

    for (let i = 0; i < addedReleases.length; i++) {
      if (addedReleases[i].id != release.id) {
        releasesArray.push(addedReleases[i]);
        idsArray.push(addedReleasesIds[i]);
      }
    }

    setAddedReleases(releasesArray);
    setAddedReleasesIds(idsArray);
  }

  return (
    <>
      <PageHead
        title={edit ? "Редактирование коллекции" : "Создание коллекции"}
        subtitle="Обложка, название, описание и релизы"
      />

      <form className="form" onSubmit={(e) => submit(e)}>
        <div className="coll-form-grid">
          <label htmlFor="dropzone-file" className="upload">
            {!imageUrl ?
              <span className="upload-empty">
                <Icon name="photo" size={28} />
                <span className="upload-t">Нажмите для загрузки</span>
                <span className="upload-s">PNG или JPG (макс. 600x337)</span>
              </span>
              // eslint-disable-next-line @next/next/no-img-element
            : <img src={imageUrl} className="upload-img" alt="Обложка" />}
            <input
              id="dropzone-file"
              type="file"
              className="sr-only"
              accept="image/jpg, image/jpeg, image/png"
              onChange={(e) => {
                handleImagePreview(e);
              }}
            />
          </label>
          <div>
            <label htmlFor="title">
              Название (минимум 10, максимум 60 символов)
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required={true}
              onChange={(e) => handleInput(e)}
              value={collectionInfo.title}
              maxLength={60}
            />
            <p className="hint">{stringLength.title}/60</p>
            <label htmlFor="description">
              Описание (максимум 1000 символов)
            </label>
            <textarea
              rows={4}
              id="description"
              name="description"
              onChange={(e) => handleInput(e)}
              value={collectionInfo.description}
              maxLength={1000}
            />
            <p className="hint">{stringLength.description}/1000</p>
            <label className="check">
              <input
                type="checkbox"
                name="private"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span>Приватная коллекция</span>
            </label>
            <button
              type="submit"
              className="btn p"
              style={{ marginTop: 14 }}
              disabled={isSending}
            >
              <Icon name={edit ? "check" : "plus"} size={16} />
              {edit ? "Обновить" : "Создать"}
            </button>
          </div>
        </div>
      </form>
      <section className="sec">
        <div className="sh">
          <h2>Релизов в коллекции: {addedReleases.length}/100</h2>
          <button
            type="button"
            className="btn g sm"
            onClick={() => setReleasesEditModalOpen(!releasesEditModalOpen)}
          >
            <Icon name="plus" size={16} />
            Добавить
          </button>
        </div>
        {addedReleases.length > 0 ?
          <div className="grid">
            {addedReleases.map((release) => {
              return (
                <div key={release.id} className="coll-pick">
                  <PosterWithStuff {...release} />
                  <button
                    type="button"
                    className="coll-pick-del"
                    onClick={() => _deleteRelease(release)}
                    aria-label="Удалить релиз"
                    title="Удалить"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        : <div className="empty">
            <span className="empty-ic">
              <Icon name="film" size={32} />
            </span>
            <div className="empty-t">Пока нет релизов</div>
            <p>Добавьте хотя бы один релиз, чтобы создать коллекцию.</p>
          </div>
        }
      </section>
      <ReleasesEditModal
        isOpen={releasesEditModalOpen}
        setIsOpen={setReleasesEditModalOpen}
        releases={addedReleases}
        releasesIds={addedReleasesIds}
        setReleases={setAddedReleases}
        setReleasesIds={setAddedReleasesIds}
      />
      <CropModal
        {...imageModalProps}
        cropParams={{
          aspectRatio: 600 / 337,
          forceAspect: true,
          guides: true,
          width: 600,
          height: 337,
        }}
        setCropModalProps={setImageModalProps}
      />
    </>
  );
};

export const ReleasesEditModal = (props: {
  isOpen: boolean;
  setIsOpen: any;
  releases: any;
  setReleases: any;
  releasesIds: any;
  setReleasesIds: any;
}) => {
  const [query, setQuery] = useState("");

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.releases.length) return null;

    const url = `${ENDPOINTS.search.releases}/${pageIndex}`
    return [url, JSON.stringify({ query, searchBy: 0 })]
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    ([url, payload]) => postFetcher(url, payload),
    { initialSize: 2, revalidateFirstPage: false }
  );

  const [content, setContent] = useState([]);
  useEffect(() => {
    if (data) {
      let allReleases = [];
      for (let i = 0; i < data.length; i++) {
        allReleases.push(...data[i].releases);
      }
      setContent(allReleases);
    }
  }, [data]);

  const [currentRef, setCurrentRef] = useState<any>(null);
  const modalRef = useCallback((ref) => {
    setCurrentRef(ref);
  }, []);

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

  function _addRelease(release: any) {
    if (props.releasesIds.length == 100) {
      toast.error(
        "Достигнуто максимальное количество релизов в коллекции - 100",
        {
          position: "bottom-center",
          hideProgressBar: true,
          type: "error",
          autoClose: 2500,
          isLoading: false,
          closeOnClick: true,
          draggable: true,
        }
      );
      return;
    }

    if (props.releasesIds.includes(release.id)) {
      toast.error("Релиз уже добавлен в коллекцию", {
        position: "bottom-center",
        hideProgressBar: true,
        type: "error",
        autoClose: 2500,
        isLoading: false,
        closeOnClick: true,
        draggable: true,
      });
      return;
    }

    const newContent = content.filter((r) => r.id !== release.id);

    setContent(newContent);
    props.setReleases([...props.releases, release]);
    props.setReleasesIds([...props.releasesIds, release.id]);
  }

  if (!props.isOpen) return null;

  return (
    <div
      className="md"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.setIsOpen(false);
      }}
    >
      <div className="mb" style={{ width: "min(1100px, 100%)" }}>
        <div className="mb-head">
          <h3>Изменить релизы в коллекции</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="search"
              placeholder="Поиск аниме..."
              aria-label="Поиск релизов"
              required
              onChange={(e) => setQuery(e.target.value)}
              value={query || ""}
            />
            <button
              type="button"
              className="btn g"
              style={{ flex: "none" }}
              onClick={() => {
                setSize(0);
                setContent([]);
                setQuery("");
              }}
            >
              Очистить
            </button>
          </div>
        </form>

        <div
          onScroll={handleScroll}
          ref={modalRef}
          className="mb-list"
          style={{ maxHeight: "56vh", marginTop: 12 }}
        >
          <div className="grid">
            {content.map((release) => {
              return (
                <button
                  type="button"
                  className="text-left"
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    color: "inherit",
                  }}
                  key={release.id}
                  onClick={() => _addRelease(release)}
                >
                  <PosterWithStuff {...release} />
                </button>
              );
            })}
          </div>
          {isLoading && (
            <div className="empty" style={{ marginBottom: 0 }}>
              <Spinner />
            </div>
          )}
          {error && <div className="empty">Произошла ошибка</div>}
        </div>
      </div>
    </div>
  );
};

