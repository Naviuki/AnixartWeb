"use client";

import { useEffect, useState } from "react";
import { Icon } from "#/components/Icon/Icon";

type Props = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  typesData: any[];
  types: number[];
  setTypes: (types: number[]) => void;
};

export const FiltersTypesModal = ({
  isOpen,
  setIsOpen,
  typesData,
  types,
  setTypes,
}: Props) => {
  const [newTypes, setNewTypes] = useState(types);

  function toggleType(number: number) {
    if (newTypes.includes(number)) {
      setNewTypes(newTypes.filter((list) => list != number));
    } else {
      setNewTypes([...newTypes, number]);
    }
  }

  useEffect(() => {
    setNewTypes(types);
  }, [types]);

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
          <h3>Варианты озвучек</h3>
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
          {typesData.map((item) => {
            return (
              <label
                className="check"
                key={`filter-types-${item.name}`}
                style={{ margin: 0 }}
              >
                <input
                  type="checkbox"
                  onChange={() => toggleType(Number(item.id))}
                  checked={newTypes.includes(Number(item.id))}
                />
                <span>{item.name}</span>
              </label>
            );
          })}
        </div>

        <div className="mb-foot">
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              setTypes([]);
              setNewTypes([]);
              setIsOpen(false);
            }}
          >
            Сбросить
          </button>
          <button
            type="button"
            className="btn g"
            onClick={() => {
              if (newTypes.length != typesData.length) {
                setNewTypes(typesData.map((item) => Number(item.id)));
              } else {
                setNewTypes([]);
              }
            }}
          >
            {newTypes.length >= typesData.length ? "Снять все" : "Выбрать все"}
          </button>
          <button
            type="button"
            className="btn p"
            onClick={() => {
              setTypes(newTypes);
              setNewTypes([]);
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
