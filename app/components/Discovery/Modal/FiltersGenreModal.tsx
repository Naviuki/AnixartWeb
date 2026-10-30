"use client";

import { FilterGenre } from "#/api/utils";
import { useEffect, useState } from "react";
import { Icon } from "#/components/Icon/Icon";

type Props = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  genres: string[];
  exclusionMode: boolean;
  save: (genres, exclusionMode) => void;
};
export const FiltersGenreModal = ({
  isOpen,
  setIsOpen,
  genres,
  exclusionMode,
  save,
}: Props) => {
  const [newGenres, setNewGenres] = useState(genres);
  const [newExclusionMode, setNewExclusionMode] = useState(exclusionMode);

  const genresLength =
    FilterGenre.uncategorized.genres.length +
    FilterGenre.audience.genres.length +
    FilterGenre.theme.genres.length;

  function toggleGenre(string: string) {
    if (newGenres.includes(string)) {
      setNewGenres(newGenres.filter((genre) => genre != string));
    } else {
      setNewGenres([...newGenres, string]);
    }
  }

  useEffect(() => {
    setNewGenres(genres);
    setNewExclusionMode(exclusionMode);
  }, [genres, exclusionMode]);

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
      <div className="mb" style={{ width: "min(760px, 100%)" }}>
        <div className="mb-head">
          <h3>Жанры</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="mb-list" style={{ maxHeight: "58vh" }}>
          {Object.entries(FilterGenre).map(([key, value]) => {
            return (
              <div
                key={`filter-genre-category-${value.name}`}
                className="filter-group"
              >
                <p className="filter-group-title">{value.name}</p>
                <div className="check-grid">
                  {value.genres.map((genre) => {
                    return (
                      <label
                        className="check"
                        key={`filter-genre-category-${value.name}-${genre}`}
                      >
                        <input
                          type="checkbox"
                          onChange={() => toggleGenre(genre)}
                          checked={newGenres.includes(genre)}
                        />
                        <span>{genre}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="filter-switch">
          <div>
            <p className="filter-pick-title">Режим исключения</p>
            <p className="hint">
              Фильтр будет искать релизы не содержащие ни один из указанных
              выше жанров
            </p>
          </div>
          <label className="check" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={newExclusionMode}
              onChange={() => setNewExclusionMode(!newExclusionMode)}
            />
            <span>Включён</span>
          </label>
        </div>

        <div className="mb-foot">
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              save([], false);
              setNewGenres([]);
              setNewExclusionMode(false);
              setIsOpen(false);
            }}
          >
            Сбросить
          </button>
          <button
            type="button"
            className="btn g"
            onClick={() => {
              if (newGenres.length != genresLength) {
                setNewGenres(
                  Object.entries(FilterGenre)
                    .map(([key, value]) => value.genres.map((genre) => genre))
                    .flat()
                );
              } else {
                setNewGenres([]);
              }
            }}
          >
            {newGenres.length >= genresLength ? "Снять все" : "Выбрать все"}
          </button>
          <button
            type="button"
            className="btn p"
            onClick={() => {
              save(newGenres, newExclusionMode);
              setNewGenres([]);
              setNewExclusionMode(false);
              setIsOpen(false);
            }}
          >
            <Icon name="check" size={16} />
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};
