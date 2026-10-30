"use client";

import { ENDPOINTS } from "#/api/config";
import { useSWRfetcher } from "#/api/utils";
import { useUserStore } from "#/store/auth";
import useSWR from "swr";
import { ReleaseCourusel } from "../ReleaseCourusel/ReleaseCourusel";

export const DiscussingToday = () => {
  const token = useUserStore((state) => state.token);
  const { data, isLoading, error } = useSWR(
    `${ENDPOINTS.discover.discussing}${token ? `?token=${token}` : ""}`,
    useSWRfetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  if (error) return <></>;
  if (isLoading) return <></>;

  return (
    <ReleaseCourusel
      sectionTitle="Обсуждаемое сегодня"
      content={data.content}
      settings={{ showDescription: false, showGenres: false }}
    />
  );
};
