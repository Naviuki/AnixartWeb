"use client";

import {
  Filter,
  FilterAgeRatingToString,
  FilterCategoryIdToString,
  FilterCountry,
  FilterDefault,
  FilterEpisodeCount,
  FilterEpisodeDuration,
  FilterProfileListIdToString,
  FilterSeasonIdToString,
  FilterSortToString,
  FilterSource,
  FilterStatusIdToString,
  FilterStudio,
  FilterYear,
  tryCatchAPI,
} from "#/api/utils";
import { useEffect, useState } from "react";
import { FiltersGenreModal } from "./FiltersGenreModal";
import { useUserStore } from "#/store/auth";
import { FiltersListExcludeModal } from "./FiltersListExcludeModal";
import { ENDPOINTS } from "#/api/config";
import { FiltersTypesModal } from "./FiltersTypesModal";
import { FiltersAgeRatingModal } from "./FiltersAgeRatingModal";
import { useRouter } from "next/navigation";
import { Icon } from "#/components/Icon/Icon";

type ModalProps = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  filter?: Filter;
  setFilter?: (filter: Filter) => void;
};

export const FiltersModal = ({
  isOpen,
  setIsOpen,
  filter,
  setFilter,
}: ModalProps) => {
  const userStore = useUserStore();
  const router = useRouter();

  const [newFilter, setNewFilter] = useState(filter || FilterDefault);
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);
  const [isListExcludeModalOpen, setIsListExcludeModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isAgeRatingModalOpen, setIsAgeRatingModalOpen] = useState(false);

  const [types, setTypes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setError(null);

      const { data, error } = await tryCatchAPI(fetch(ENDPOINTS.filterTypes));

      if (error) {
        setError(error);
      } else {
        setTypes(data.types);
      }
    };
    fetchData();
  }, []);

  function saveGenres(genres, is_genres_exclude_mode_enabled) {
    setNewFilter({ ...newFilter, genres, is_genres_exclude_mode_enabled });
  }

  function saveFilter() {
    const _filter = JSON.stringify(newFilter);
    if (setFilter) {
      setFilter(newFilter);
    } else {
      router.push(`/discovery/filter?filter=${_filter}`);
    }
    setIsOpen(false);
  }

  const episodesName =
    FilterEpisodeCount.find(
      (episode) =>
        episode.episodes_from === newFilter.episodes_from &&
        episode.episodes_to === newFilter.episodes_to
    )?.name || "Неважно";
  const durationName =
    FilterEpisodeDuration.find(
      (episode) =>
        episode.episode_duration_from === newFilter.episode_duration_from &&
        episode.episode_duration_to === newFilter.episode_duration_to
    )?.name || "Неважно";

  if (!isOpen) return null;

  return (
    <>
      <div
        className="md"
        role="dialog"
        aria-modal="true"
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}
      >
        <div className="mb" style={{ width: "min(820px, 100%)" }}>
          <div className="mb-head">
            <h3>Фильтр</h3>
            <button
              type="button"
              className="mb-close"
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="form filter-grid">
            <div>
              <label htmlFor="filter-country">Страна</label>
              <select
                id="filter-country"
                value={newFilter.country || ""}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    country: e.target.value || null,
                  })
                }
              >
                <option value="">Неважно</option>
                {FilterCountry.map((item) => (
                  <option key={`filter-country-${item}`} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-category">Категория</label>
              <select
                id="filter-category"
                value={newFilter.category_id || ""}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    category_id: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              >
                <option value="">Неважно</option>
                {Object.entries(FilterCategoryIdToString).map(
                  ([key, value]) => (
                    <option key={`filter-category-${key}`} value={key}>
                      {value}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label htmlFor="filter-studio">Студия</label>
              <select
                id="filter-studio"
                value={newFilter.studio || ""}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    studio: e.target.value || null,
                  })
                }
              >
                <option value="">Неважно</option>
                {FilterStudio.map((value) => (
                  <option key={`filter-studio-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-source">Первоисточник</label>
              <select
                id="filter-source"
                value={newFilter.source || ""}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    source: e.target.value || null,
                  })
                }
              >
                <option value="">Неважно</option>
                {FilterSource.map((value) => (
                  <option key={`filter-source-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-start-year">Год от</label>
              <select
                id="filter-start-year"
                value={newFilter.start_year || ""}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    start_year: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              >
                <option value="">Неважно</option>
                {FilterYear.map((value) => (
                  <option key={`filter-start-year-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-end-year">Год до</label>
              <select
                id="filter-end-year"
                value={newFilter.end_year || ""}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    end_year: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">Неважно</option>
                {FilterYear.map((value) => (
                  <option key={`filter-end-year-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-season">Сезон</label>
              <select
                id="filter-season"
                value={newFilter.season || ""}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    season: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">Неважно</option>
                {Object.entries(FilterSeasonIdToString).map(([key, value]) => (
                  <option key={`filter-season-${key}`} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-status">Статус</label>
              <select
                id="filter-status"
                value={newFilter.status_id || ""}
                onChange={(e) =>
                  setNewFilter({
                    ...newFilter,
                    status_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">Неважно</option>
                {Object.entries(FilterStatusIdToString).map(([key, value]) => (
                  <option key={`filter-status-${key}`} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-episodes">Эпизодов</label>
              <select
                id="filter-episodes"
                value={episodesName}
                onChange={(e) => {
                  const value = FilterEpisodeCount.find(
                    (episode) => episode.name === e.target.value
                  );
                  if (value) {
                    setNewFilter({
                      ...newFilter,
                      episodes_from: value.episodes_from,
                      episodes_to: value.episodes_to,
                    });
                  }
                }}
              >
                {FilterEpisodeCount.map((value) => (
                  <option key={`filter-episodes-${value.name}`} value={value.name}>
                    {value.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-duration">Длительность эпизода</label>
              <select
                id="filter-duration"
                value={durationName}
                onChange={(e) => {
                  const value = FilterEpisodeDuration.find(
                    (episode) => episode.name === e.target.value
                  );
                  if (value) {
                    setNewFilter({
                      ...newFilter,
                      episode_duration_from: value.episode_duration_from,
                      episode_duration_to: value.episode_duration_to,
                    });
                  }
                }}
              >
                {FilterEpisodeDuration.map((value) => (
                  <option
                    key={`filter-duration-${value.name}`}
                    value={value.name}
                  >
                    {value.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-sort">Сортировка</label>
              <select
                id="filter-sort"
                value={newFilter.sort}
                onChange={(e) =>
                  setNewFilter({ ...newFilter, sort: Number(e.target.value) })
                }
              >
                {Object.entries(FilterSortToString).map(([key, value]) => (
                  <option key={`filter-sort-${key}`} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-picks">
            <div className="filter-pick">
              <p className="filter-pick-title">Жанры</p>
              <button
                type="button"
                className="btn g"
                onClick={() => setIsGenreModalOpen(true)}
              >
                {newFilter.genres.length > 0 ?
                  newFilter.genres.join(", ")
                : "Неважно"}
              </button>
              <p className="hint">
                Будет искать релизы, содержащие каждый из указанных жанров.
                Рекомендуется выбирать не более 3 жанров
              </p>
            </div>

            {userStore.isAuth ?
              <div className="filter-pick">
                <p className="filter-pick-title">Исключить закладки</p>
                <button
                  type="button"
                  className="btn g"
                  onClick={() => setIsListExcludeModalOpen(true)}
                >
                  {newFilter.profile_list_exclusions.length > 0 ?
                    newFilter.profile_list_exclusions
                      .map((id) => FilterProfileListIdToString[id])
                      .join(", ")
                  : "Неважно"}
                </button>
                <p className="hint">
                  Исключит из выдачи релизы, входящие в указанные закладки
                </p>
              </div>
            : ""}

            <div className="filter-pick">
              <p className="filter-pick-title">Варианты озвучек</p>
              <button
                type="button"
                className="btn g"
                onClick={() => setIsTypeModalOpen(true)}
              >
                {error ?
                  error.message
                : newFilter.types.length > 0 ?
                  newFilter.types
                    .map((type) => types.find((t) => t.id === type)?.name)
                    .join(", ")
                : "Неважно"}
              </button>
            </div>

            <div className="filter-pick">
              <p className="filter-pick-title">Возрастное ограничение</p>
              <button
                type="button"
                className="btn g"
                onClick={() => setIsAgeRatingModalOpen(true)}
              >
                {newFilter.age_ratings.length > 0 ?
                  newFilter.age_ratings
                    .map((age_rating) => FilterAgeRatingToString[age_rating])
                    .join(", ")
                : "Неважно"}
              </button>
            </div>
          </div>

          <div className="mb-foot">
            <button type="button" className="btn g" onClick={() => setIsOpen(false)}>
              Отмена
            </button>
            <button type="button" className="btn p" onClick={saveFilter}>
              <Icon name="check" size={16} />
              Применить
            </button>
          </div>
        </div>
      </div>

      <FiltersGenreModal
        isOpen={isGenreModalOpen}
        setIsOpen={setIsGenreModalOpen}
        genres={newFilter.genres}
        exclusionMode={newFilter.is_genres_exclude_mode_enabled}
        save={saveGenres}
      />
      <FiltersListExcludeModal
        isOpen={isListExcludeModalOpen}
        setIsOpen={setIsListExcludeModalOpen}
        lists={newFilter.profile_list_exclusions}
        setLists={(profile_list_exclusions) =>
          setNewFilter({ ...newFilter, profile_list_exclusions })
        }
      />
      <FiltersTypesModal
        isOpen={isTypeModalOpen}
        setIsOpen={setIsTypeModalOpen}
        typesData={types}
        types={newFilter.types}
        setTypes={(types) => setNewFilter({ ...newFilter, types })}
      />
      <FiltersAgeRatingModal
        isOpen={isAgeRatingModalOpen}
        setIsOpen={setIsAgeRatingModalOpen}
        ageRatings={newFilter.age_ratings}
        setAgeRatings={(age_ratings) =>
          setNewFilter({ ...newFilter, age_ratings })
        }
      />
    </>
  );
};
