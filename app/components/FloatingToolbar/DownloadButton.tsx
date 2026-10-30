"use client";

import { ANILIBRIA_API_URL, TORAPI_API_URL } from "#/api/config";
import { formatBytes } from "#/api/utils";
import { useEffect, useState } from "react";
import { Dropdown, DropdownItem } from "flowbite-react";
import { Icon } from "#/components/Icon/Icon";
import { Spinner } from "#/components/Spinner/Spinner";

type Props = {
  release_id: number;
  release_title_ru: string;
  release_title_en: string;
};

const SERVICES = [
  { id: "anilibria", title: "Anilibria" },
  { id: "rutracker", title: "Rutracker" },
  { id: "rutor", title: "Rutor" },
  { id: "kinozal", title: "Kinozal" },
  { id: "nonameclub", title: "NoNameClub" },
] as const;

export const DownloadButton = ({
  release_id,
  release_title_ru,
  release_title_en,
}: Props) => {
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn icon-only"
        onClick={() => setOpenModal(true)}
        aria-label="Скачать"
        title="Скачать"
      >
        <Icon name="download" size={18} />
      </button>
      <DownloadModal
        release_title_ru={release_title_ru}
        release_title_en={release_title_en}
        openModal={openModal}
        setOpenModal={setOpenModal}
      />
    </>
  );
};

const DownloadModal = ({
  release_title_ru,
  release_title_en,
  openModal,
  setOpenModal,
}) => {
  const [releaseTitle, setReleaseTitle] = useState(release_title_ru);
  const [tab, setTab] = useState<string>("anilibria");

  if (!openModal) return <></>;

  return (
    <div className="md" onClick={() => setOpenModal(false)}>
      <div
        className="mb"
        style={{ width: "min(720px, 100%)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-head">
          <h3>Поиск торрентов</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => setOpenModal(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <span className="muted small">Искать по:</span>
          <Dropdown
            label={
              releaseTitle == release_title_ru ?
                "Русскому названию"
              : "Оригинальному названию"
            }
            dismissOnClick={true}
            renderTrigger={() => (
              <button type="button" className="chip">
                {releaseTitle == release_title_ru ?
                  "Русскому названию"
                : "Оригинальному названию"}
                <Icon name="chevron" size={14} />
              </button>
            )}
          >
            <DropdownItem onClick={() => setReleaseTitle(release_title_ru)}>
              Русскому названию
            </DropdownItem>
            <DropdownItem onClick={() => setReleaseTitle(release_title_en)}>
              Оригинальному названию
            </DropdownItem>
          </Dropdown>
        </div>

        <div className="chiprow" style={{ marginBottom: 12 }}>
          {SERVICES.map((service) => (
            <button
              key={service.id}
              type="button"
              className={`chip ${tab === service.id ? "active" : ""}`}
              onClick={() => setTab(service.id)}
            >
              {service.title}
            </button>
          ))}
        </div>

        <div className="mb-list">
          {tab === "anilibria" ?
            <AnilibriaTorrentTab release_title={releaseTitle} />
          : <TorApiTorrentTab
              release_title={releaseTitle}
              service={tab as "rutracker" | "rutor" | "kinozal" | "nonameclub"}
            />
          }
        </div>
      </div>
    </div>
  );
};

type TorrentItemProps = {
  title: string;
  filename: string;
  magnet: null | string;
  file: null | string;
  // ---
  size: null | string;
  codec: null | string;
  quality: null | string;
  seeders: null | number;
  leechers: null | number;
};

const TorrentItem = ({
  title,
  filename,
  magnet,
  file,
  size,
  seeders,
  leechers,
  codec,
  quality,
}: TorrentItemProps) => {
  return (
    <div className="box" style={{ marginBottom: 0 }}>
      <p style={{ fontWeight: 700, lineHeight: 1.3 }}>{title}</p>
      <p className="muted small" style={{ marginTop: 2 }}>
        {filename}
        {size ? ` · ${size}` : ""}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 8,
          flexWrap: "wrap",
        }}
      >
        <div className="chiprow">
          {codec != null && <span className="badge soft">{codec}</span>}
          {quality != null && <span className="badge soft">{quality}</span>}
          {seeders != null && (
            <span
              className="badge"
              style={{
                background: "color-mix(in srgb, var(--rate-5) 18%, transparent)",
                borderColor: "transparent",
              }}
            >
              {seeders} Сидов
            </span>
          )}
          {leechers != null && (
            <span
              className="badge"
              style={{
                background: "color-mix(in srgb, var(--rate-1) 18%, transparent)",
                borderColor: "transparent",
              }}
            >
              {leechers} Личей
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {magnet && (
            <a
              className="btn p"
              style={{ padding: "5px 10px", fontSize: 12 }}
              href={magnet}
            >
              <Icon name="link" size={14} />
              Magnet
            </a>
          )}
          {file && (
            <a
              className="btn"
              style={{ padding: "5px 10px", fontSize: 12 }}
              href={file}
            >
              <Icon name="download" size={14} />
              Файл
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const AnilibriaTorrentTab = ({ release_title }: { release_title: string }) => {
  const [anilibria, setAnilibria] = useState<any>({
    isLoading: true,
    error: false,
    errorDesc: "",
    data: null,
  });

  useEffect(() => {
    async function _getData() {
      setAnilibria((state) => ({
        isLoading: true,
        error: false,
        errorDesc: "",
        data: null,
      }));

      const AL_QueryRes = await fetch(
        `${ANILIBRIA_API_URL}/api/v1/app/search/releases?query=${release_title}`
      );
      if (!AL_QueryRes.ok) {
        setAnilibria((state) => ({
          isLoading: false,
          error: true,
          errorDesc: "Не удалось найти релиз",
          data: null,
        }));
        return;
      }
      const AL_QueryData = await AL_QueryRes.json();

      if (AL_QueryData.length === 0) {
        setAnilibria((state) => ({
          isLoading: false,
          error: true,
          errorDesc: "Не удалось найти релиз",
          data: null,
        }));
        return;
      }

      const AL_TorrentRes = await fetch(
        `${ANILIBRIA_API_URL}/api/v1/anime/torrents/release/${AL_QueryData[0].id}`
      );
      if (!AL_TorrentRes.ok) {
        setAnilibria((state) => ({
          isLoading: false,
          error: true,
          errorDesc: "Торренты не нашлись",
          data: null,
        }));
        return;
      }
      const AL_TorrentData = await AL_TorrentRes.json();

      setAnilibria((state) => ({
        isLoading: false,
        error: false,
        errorDesc: "",
        data: AL_TorrentData,
      }));
    }
    _getData();
  }, [release_title]);

  if (anilibria.isLoading)
    return (
      <div className="empty" style={{ marginBottom: 0 }}>
        <Spinner />
        <p>Загрузка...</p>
      </div>
    );
  if (anilibria.error) return <p className="muted">{anilibria.errorDesc}</p>;
  if (anilibria.data.length === 0)
    return <p className="muted">Торренты не нашлись</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {anilibria.data.map((item: any) => {
        return (
          <TorrentItem
            key={`anilibria-torrent-${item.hash}`}
            title={`${item.release.name.main || item.release.name.english} (${item.description} эп.)`}
            magnet={item.magnet}
            file={`${ANILIBRIA_API_URL}/api/v1/anime/torrents/${item.hash}/file`}
            size={formatBytes(item.size)}
            seeders={item.seeders}
            leechers={item.leechers}
            codec={item.codec.value || null}
            quality={item.quality.value || null}
            filename={`${item.filename}`}
          />
        );
      })}
    </div>
  );
};

type TorAPIRequest = {
  type: "title" | "id";
  service: "rutracker" | "rutor" | "kinozal" | "nonameclub";
  query: string;
  category?: number;
  year?: number;
};

const fetchTorAPI = async ({
  type,
  service,
  query,
  category,
  year,
}: TorAPIRequest) => {
  const url = new URL(`${TORAPI_API_URL}/api/search/${type}/${service}`);
  url.searchParams.append("query", query);
  if (category) {
    url.searchParams.append("category", category.toString());
  }
  if (year) {
    url.searchParams.append("year", year.toString());
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    return null;
  }
  return await res.json();
};

const TorApiTorrentTab = ({
  release_title,
  service,
}: {
  release_title: string;
  service: "rutracker" | "rutor" | "kinozal" | "nonameclub";
}) => {
  const [torApi, setTorApi] = useState<any>({
    isLoading: true,
    error: false,
    errorDesc: "",
    data: null,
  });

  useEffect(() => {
    async function _getData() {
      setTorApi((state) => ({
        isLoading: true,
        error: false,
        errorDesc: "",
        data: null,
      }));

      const RutrackerQueryRes = await fetchTorAPI({
        type: "title",
        service,
        query: release_title,
      });

      if (!RutrackerQueryRes || RutrackerQueryRes.Result) {
        setTorApi((state) => ({
          isLoading: false,
          error: true,
          errorDesc: "Торренты не нашлись",
          data: null,
        }));
        return;
      }

      const data = [];
      for (let i = 0; i < RutrackerQueryRes.length; i++) {
        const torrent = await fetchTorAPI({
          type: "id",
          service,
          query: RutrackerQueryRes[i].Id,
        });
        if (torrent && torrent.length > 0) {
          data.push({
            ...RutrackerQueryRes[i],
            ...torrent[0],
          });
        }
      }

      setTorApi((state) => ({
        isLoading: false,
        error: false,
        errorDesc: "",
        data,
      }));
    }
    _getData();
  }, [release_title, service]);

  if (torApi.isLoading)
    return (
      <div className="empty" style={{ marginBottom: 0 }}>
        <Spinner />
        <p>Загрузка...</p>
      </div>
    );
  if (torApi.error) return <p className="muted">{torApi.errorDesc}</p>;
  if (torApi.data.length === 0)
    return <p className="muted">Торренты не нашлись</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {torApi.data.map((item: any) => {
        return (
          <TorrentItem
            key={`torapi-torrent-${item.Hash}`}
            title={item.Name || item.Files[0].Name}
            filename={item.Duration}
            codec={item.Video || null}
            quality={item.Quality || null}
            size={item.Size}
            leechers={item.Peers}
            seeders={item.Seeds}
            magnet={item.Magnet}
            file={item.Torrent}
          />
        );
      })}
    </div>
  );
};
