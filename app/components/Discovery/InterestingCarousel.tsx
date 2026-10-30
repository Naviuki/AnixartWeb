"use client";

import { ENDPOINTS } from "#/api/config";
import { useSWRfetcher } from "#/api/utils";
import useSWR from "swr";
import Image from "next/image";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import Link from "next/link";
import { Icon } from "#/components/Icon/Icon";

export const InterestingCarousel = () => {
  const { data, isLoading, error } = useSWR(
    ENDPOINTS.discover.interesting,
    useSWRfetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  const [swiper, setSwiper] = useState<any>(null);

  if (error) return <></>;
  if (isLoading) return <></>;

  return (
    <div className="carousel ic-carousel">
      <Swiper
        onSwiper={setSwiper}
        spaceBetween={14}
        slidesPerView={"auto"}
        direction={"horizontal"}
        allowTouchMove={true}
      >
        {data.content.map((item) => {
          return (
            <SwiperSlide key={`discover-interesting-${item.id}`} className="ic-slide">
              <Link href={`/release/${item.action}`} className="ic-card">
                <Image
                  src={item.image}
                  alt=""
                  fill={true}
                  sizes="(max-width: 760px) 82vw, 480px"
                  className="object-cover"
                />
                <div className="ic-grad"></div>
                <div className="ic-body">
                  <p className="ic-title">{item.title}</p>
                  <p className="ic-desc">{item.description}</p>
                </div>
              </Link>
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
  );
};
