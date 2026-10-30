"use client";

import { FilterAgeRatingToString } from "#/api/utils";
import { useEffect, useState } from "react";
import { Icon } from "#/components/Icon/Icon";

type Props = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  ageRatings: number[];
  setAgeRatings: (lists: number[]) => void;
};

export const FiltersAgeRatingModal = ({
  isOpen,
  setIsOpen,
  ageRatings,
  setAgeRatings,
}: Props) => {
  const [newAgeRatings, setNewAgeRatings] = useState(ageRatings);

  function toggleRating(number: number) {
    if (newAgeRatings.includes(number)) {
      setNewAgeRatings(newAgeRatings.filter((rating) => rating != number));
    } else {
      setNewAgeRatings([...newAgeRatings, number]);
    }
  }

  useEffect(() => {
    setNewAgeRatings(ageRatings);
  }, [ageRatings]);

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
      <div className="mb" style={{ width: "min(520px, 100%)" }}>
        <div className="mb-head">
          <h3>Возрастное ограничение</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="check-list">
          {Object.entries(FilterAgeRatingToString).map(([key, value]) => {
            return (
              <label
                className="check"
                key={`filter-age-rating-${value}`}
                style={{ margin: 0 }}
              >
                <input
                  type="checkbox"
                  onChange={() => toggleRating(Number(key))}
                  checked={newAgeRatings.includes(Number(key))}
                />
                <span>{value}</span>
              </label>
            );
          })}
        </div>

        <div className="mb-foot">
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              setAgeRatings([]);
              setNewAgeRatings([]);
              setIsOpen(false);
            }}
          >
            Сбросить
          </button>
          <button
            type="button"
            className="btn g"
            onClick={() => {
              if (
                newAgeRatings.length !=
                Object.keys(FilterAgeRatingToString).length
              ) {
                setNewAgeRatings(
                  Object.keys(FilterAgeRatingToString).map((key) => Number(key))
                );
              } else {
                setNewAgeRatings([]);
              }
            }}
          >
            {newAgeRatings.length >=
            Object.keys(FilterAgeRatingToString).length ?
              "Снять все"
            : "Выбрать все"}
          </button>
          <button
            type="button"
            className="btn p"
            onClick={() => {
              setAgeRatings(newAgeRatings);
              setNewAgeRatings([]);
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
