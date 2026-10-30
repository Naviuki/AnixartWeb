"use client";
import { useState } from "react";
import { CollectionLink } from "../CollectionLink/CollectionLink";
import { AddCollectionLink } from "../AddCollectionLink/AddCollectionLink";
import Link from "next/link";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Icon } from "#/components/Icon/Icon";

export const CollectionCourusel = (props: {
  sectionTitle: string;
  showAllLink?: string;
  content: any;
  isMyCollections?: boolean;
}) => {
  const [swiper, setSwiper] = useState<any>(null);

  return (
    <section className="sec">
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
          className="carousel-swiper"
        >
          {props.isMyCollections && (
            <SwiperSlide className="coll-slide">
              <AddCollectionLink />
            </SwiperSlide>
          )}
          {props.content.map((collection) => {
            return (
              <SwiperSlide className="coll-slide" key={collection.id}>
                <CollectionLink {...collection} />
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
