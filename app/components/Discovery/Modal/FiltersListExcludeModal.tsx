"use client";

import { FilterProfileListIdToString } from "#/api/utils";
import { useEffect, useState } from "react";
import { Icon } from "#/components/Icon/Icon";

type Props = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  lists: number[];
  setLists: (lists: number[]) => void;
};

export const FiltersListExcludeModal = ({
  isOpen,
  setIsOpen,
  lists,
  setLists,
}: Props) => {
  const [newList, setNewList] = useState(lists);

  function toggleList(number: number) {
    if (newList.includes(number)) {
      setNewList(newList.filter((list) => list != number));
    } else {
      setNewList([...newList, number]);
    }
  }

  useEffect(() => {
    setNewList(lists);
  }, [lists]);

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
          <h3>Выберите списки</h3>
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
          {Object.entries(FilterProfileListIdToString).map(([key, value]) => {
            return (
              <label
                className="check"
                key={`filter-list-exclude-${value}`}
                style={{ margin: 0 }}
              >
                <input
                  type="checkbox"
                  onChange={() => toggleList(Number(key))}
                  checked={newList.includes(Number(key))}
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
              setLists([]);
              setNewList([]);
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
                newList.length !=
                Object.keys(FilterProfileListIdToString).length
              ) {
                setNewList(
                  Object.keys(FilterProfileListIdToString).map((key) =>
                    Number(key)
                  )
                );
              } else {
                setNewList([]);
              }
            }}
          >
            {newList.length >=
            Object.keys(FilterProfileListIdToString).length ?
              "Снять все"
            : "Выбрать все"}
          </button>
          <button
            type="button"
            className="btn p"
            onClick={() => {
              setLists(newList);
              setNewList([]);
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
