"use client";

import { useState } from "react";
import { useThemeMode } from "flowbite-react";
import { UserRole } from "./Profile.Role";
import { UserSocial } from "./Profile.Social";
import Link from "next/link";
import { Icon } from "#/components/Icon/Icon";

interface ProfileUserProps {
  avatar: string;
  login: string;
  status: string;
  rating: number;
  roles: {
    id: number;
    name: string;
    color: string;
  }[];
  isMyProfile: boolean;
  isSponsor: boolean;
  isBlocked: boolean;
  isVerified: boolean;
  isOnline: boolean;
  socials: {
    vk: string;
    tg: string;
    tt: string;
    inst: string;
    discord: string;
  };
  is_social_hidden: boolean;
}

export const ProfileUser = ({
  avatar,
  login,
  status,
  rating,
  roles,
  isMyProfile,
  isVerified,
  isOnline,
  isSponsor,
  isBlocked,
  socials,
  is_social_hidden,
}: ProfileUserProps) => {
  const theme = useThemeMode().mode;
  const [isAvatarBroken, setIsAvatarBroken] = useState(false);
  const hasSocials =
    socials.vk || socials.tg || socials.discord || socials.tt || socials.inst;

  return (
    <section className="profile-head">
      <div className="profile-ava">
        <span>{login ? login[0].toUpperCase() : "А"}</span>
        {avatar && !isAvatarBroken && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" onError={() => setIsAvatarBroken(true)} />
        )}
      </div>

      <div className="profile-info">
        <h1 className="profile-name">
          {login}
          {isOnline && (
            <span className="badge">
              <span className="dot" style={{ background: "var(--rate-5)" }} />
              Онлайн
            </span>
          )}
        </h1>

        {status && <div className="profile-status">{status}</div>}

        <div className="chiprow" style={{ marginTop: 10 }}>
          <span
            className="badge"
            style={{
              color:
                rating > 0 ? "var(--rate-5-ink)" : "var(--rate-1-ink)",
              borderColor:
                rating > 0 ?
                  "color-mix(in srgb, var(--rate-5) 45%, transparent)"
                : "color-mix(in srgb, var(--rate-1) 45%, transparent)",
              background:
                rating > 0 ?
                  "color-mix(in srgb, var(--rate-5) 12%, transparent)"
                : "color-mix(in srgb, var(--rate-1) 12%, transparent)",
            }}
          >
            <Icon name="star" size={12} fill />
            Рейтинг {rating}
          </span>

          {isMyProfile && <UserRole name="Мой профиль" color="5b6cff" />}
          {isBlocked && <UserRole name="Заблокирован" color="ef4444" />}
          {isVerified && <UserRole name="Верифицирован" color="22c55e" />}
          {isSponsor && <UserRole name="Спонсор Anixart" color="eab308" />}
          {roles.map((role) => (
            <UserRole key={role.id} name={role.name} color={role.color} />
          ))}
        </div>

        {!is_social_hidden && hasSocials && (
          <div className="chiprow" style={{ marginTop: 10 }}>
            {socials.vk && (
              <Link href={`https://vk.com/${socials.vk}`} target="_blank">
                <UserSocial
                  nickname={socials.vk}
                  url={`https://vk.com/${socials.vk}`}
                  color="4a76a8"
                />
              </Link>
            )}
            {socials.tg && (
              <Link href={`https://t.me/${socials.tg}`} target="_blank">
                <UserSocial
                  nickname={socials.tg}
                  url={`https://t.me/${socials.tg}`}
                  color="2aabee"
                />
              </Link>
            )}
            {socials.tt && (
              <Link href={`https://tiktok.com/@${socials.tt}`} target="_blank">
                <UserSocial
                  nickname={socials.tt}
                  url={`https://tiktok.com/@${socials.tt}`}
                  color={theme == "light" ? "000000" : "ffffff"}
                />
              </Link>
            )}
            {socials.inst && (
              <Link
                href={`https://instagram.com/${socials.inst}`}
                target="_blank"
              >
                <UserSocial
                  nickname={socials.inst}
                  url={`https://instagram.com/${socials.inst}`}
                  color="c32aa3"
                />
              </Link>
            )}
            {socials.discord && (
              <UserSocial
                nickname={socials.discord}
                url={`https://discord.com/${socials.discord}`}
                color="5865f2"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};
