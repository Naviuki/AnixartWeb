"use client";
import { CollectionsOfTheWeek } from "#/components/Discovery/CollectionsOfTheWeek";
import { DiscussingToday } from "#/components/Discovery/DiscussingToday";
import { InterestingCarousel } from "#/components/Discovery/InterestingCarousel";
import { FiltersModal } from "#/components/Discovery/Modal/FiltersModal";
import { PopularModal } from "#/components/Discovery/Modal/PopularModal";
import { ScheduleModal } from "#/components/Discovery/Modal/ScheduleModal";
import { RecommendedCarousel } from "#/components/Discovery/RecommendedCarousel";
import { WatchingNowCarousel } from "#/components/Discovery/WatchingNowCarousel";
import { Icon } from "#/components/Icon/Icon";
import { useRouter } from "next/navigation";
import { useState } from "react";

const QUICK_ACTIONS = [
  {
    id: "popular",
    icon: "flame",
    title: "Популярное",
    subtitle: "Топ за неделю",
    color: "var(--rate-2)",
  },
  {
    id: "schedule",
    icon: "calendar",
    title: "Расписание",
    subtitle: "Выходы по дням",
    color: "var(--st-watching)",
  },
  {
    id: "collections",
    icon: "collection",
    title: "Коллекции",
    subtitle: "Подборки сообщества",
    color: "var(--st-planned)",
  },
  {
    id: "filter",
    icon: "filter",
    title: "Фильтр",
    subtitle: "Жанры и рейтинги",
    color: "var(--st-watched)",
  },
];

export const DiscoverPage = () => {
  const router = useRouter();
  const [PopularModalOpen, setPopularModalOpen] = useState(false);
  const [ScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [FiltersModalOpen, setFiltersModalOpen] = useState(false);

  const openAction = (id: string) => {
    if (id === "popular") setPopularModalOpen(true);
    if (id === "schedule") setScheduleModalOpen(true);
    if (id === "filter") setFiltersModalOpen(true);
    if (id === "collections") {
      router.push("/discovery/collections?sort=recent");
    }
  };

  return (
    <>
      <InterestingCarousel />

      <div className="quickgrid">
        {QUICK_ACTIONS.map((action) => (
          <button
            type="button"
            className="quick"
            key={action.id}
            onClick={() => openAction(action.id)}
          >
            <span
              className="quick-ic"
              style={{
                background: `color-mix(in srgb, ${action.color} 16%, transparent)`,
                color: action.color,
              }}
            >
              <Icon name={action.icon} size={20} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="quick-t">{action.title}</span>
              <span className="quick-s">{action.subtitle}</span>
            </span>
          </button>
        ))}
      </div>

      <RecommendedCarousel />
      <DiscussingToday />
      <WatchingNowCarousel />
      <CollectionsOfTheWeek />

      <PopularModal isOpen={PopularModalOpen} setIsOpen={setPopularModalOpen} />
      <ScheduleModal
        isOpen={ScheduleModalOpen}
        setIsOpen={setScheduleModalOpen}
      />
      <FiltersModal isOpen={FiltersModalOpen} setIsOpen={setFiltersModalOpen} />
    </>
  );
};
