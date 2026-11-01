"use client";
import { useState } from "react";
import { ReleaseLink } from "../ReleaseLink/ReleaseLinkUpdate";
import Link from "next/link";

import { Swiper, SwiperSlide } from "swiper/react";
import Styles from "./ReleaseCourusel.module.css";
import "swiper/css";
import { Icon } from "#/components/Icon/Icon";
import { usePreferencesStore } from "#/store/preferences";

export const ReleaseCourusel = (props: {
  sectionTitle: string;
  showAllLink?: string;
  content: any;
  settings?: {
    showGenres?: boolean;
    showDescription?: boolean;
  };
}) => {
  const [swiper, setSwiper] = useState<any>(null);
  // Ширина слайда берётся из переменной --cw в CSS, inline-ширина ломает Swiper
  const card = usePreferencesStore((state) => state.appearance.card);

  return (
    <section className={`sec ${Styles.section}`}>
      <div className="sh">
        <h2>{props.sectionTitle}</h2>
        {props.showAllLink && (
          <Link href={props.showAllLink}>
            Показать все
            <Icon name="arrowRight" size={16} />
          </Link>
        )}
      </div>
      <div className="carousel">
        <Swiper
          onSwiper={setSwiper}
          spaceBetween={14}
          slidesPerView={"auto"}
          direction={"horizontal"}
          allowTouchMove={true}
        >
          {props.content.map((release) => {
            return (
              <SwiperSlide
                key={release.id}
                // Классы карточки задаются здесь, чтобы варианты иконками
                // и списком менялись вместе с выбранной раскладкой
                className={`${Styles.slide} slide-c-${card}`}
              >
                <ReleaseLink {...release} settings={props.settings} />
              </SwiperSlide>
            );
          })}
        </Swiper>
        <button
          type="button"
          className="cnav cnav-prev"
          aria-label="Назад"
          onClick={() => swiper?.slidePrev()}
        >
          <Icon name="chevron" size={20} />
        </button>
        <button
          type="button"
          className="cnav cnav-next"
          aria-label="Вперёд"
          onClick={() => swiper?.slideNext()}
        >
          <Icon name="chevron" size={20} />
        </button>
      </div>
    </section>
  );
};
