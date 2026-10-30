"use client";

import { ENDPOINTS } from "#/api/config";
import { FetchFilter, useSWRfetcher } from "#/api/utils";
import { useUserStore } from "#/store/auth";
import useSWR from "swr";

import { tabs, tabsId } from "./PopularFilters";
import { useEffect, useState } from "react";
import { ReleaseLink } from "#/components/ReleaseLink/ReleaseLinkUpdate";
import { Spinner } from "#/components/Spinner/Spinner";
import { Chip, ChipRow } from "#/components/Chips/ChipRow";
import { Icon } from "#/components/Icon/Icon";
type ModalProps = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
};

export const PopularModal = ({ isOpen, setIsOpen }: ModalProps) => {
  const token = useUserStore((state) => state.token);
  const [tab, setTab] = useState<
    "ongoing" | "finished" | "films" | "ova" | string
  >("ongoing");
  const [content, setContent] = useState(null);

  useEffect(() => {
    setContent(null);
    async function _loadReleases() {
      const [data, error] = await FetchFilter(
        tabs[tabsId[tab]].filter,
        0,
        token
      );
      if (!error) {
        setContent(data.content);
      }
    }
    _loadReleases();
  }, [tab, token]);

  if (!isOpen) return null;

  return (
    <div
      className="md"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) setIsOpen(false);
      }}
    >
      <div className="mb" style={{ width: "min(1100px, 100%)" }}>
        <div className="mb-head">
          <h3>Популярное</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <ChipRow>
          {tabs.map((item) => (
            <Chip
              key={`tabs-popular-${item.name}`}
              active={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.name}
            </Chip>
          ))}
        </ChipRow>

        <div className="mb-list" style={{ marginTop: 12 }}>
          {content ?
            <div className="grid">
              {content.map((release) => {
                return (
                  <div key={release.id} className="w-full h-full">
                    <ReleaseLink {...release} />
                  </div>
                );
              })}
            </div>
          : <div className="empty" style={{ marginBottom: 0 }}>
              <Spinner />
            </div>
          }
        </div>
      </div>
    </div>
  );
};
