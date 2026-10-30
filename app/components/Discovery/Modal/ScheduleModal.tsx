"use client";

import { ENDPOINTS } from "#/api/config";
import { useSWRfetcher } from "#/api/utils";
import useSWR from "swr";
import { Spinner } from "#/components/Spinner/Spinner";
import { ReleaseCourusel } from "#/components/ReleaseCourusel/ReleaseCourusel";
import { Icon } from "#/components/Icon/Icon";
type ModalProps = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
};

export const ScheduleModal = ({ isOpen, setIsOpen }: ModalProps) => {
  const { data, isLoading, error } = useSWR(
    ENDPOINTS.discover.schedule,
    useSWRfetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

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
          <h3>Расписание</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {!error ?
          isLoading ?
            <div className="empty" style={{ marginBottom: 0 }}>
              <Spinner />
            </div>
          : <div className="schedule">
              <ReleaseCourusel
                content={data.monday}
                sectionTitle={"Понедельник"}
              />
              <ReleaseCourusel
                content={data.tuesday}
                sectionTitle={"Вторник"}
              />
              <ReleaseCourusel content={data.wednesday} sectionTitle={"Среда"} />
              <ReleaseCourusel
                content={data.thursday}
                sectionTitle={"Четверг"}
              />
              <ReleaseCourusel content={data.friday} sectionTitle={"Пятница"} />
              <ReleaseCourusel
                content={data.saturday}
                sectionTitle={"Суббота"}
              />
              <ReleaseCourusel
                content={data.sunday}
                sectionTitle={"Воскресенье"}
              />
            </div>
        : <div className="empty" style={{ marginBottom: 0 }}>
            <span className="empty-ic">
              <Icon name="info" size={32} />
            </span>
            <div className="empty-t">Ошибка загрузки</div>
            <p>Не удалось загрузить расписание. Попробуйте позже.</p>
          </div>
        }
      </div>
    </div>
  );
};
