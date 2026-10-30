"use server";

import Image from "next/image";

import * as fs from "node:fs";
import * as path from "node:path";
import { CURRENT_APP_VERSION } from "#/api/config";
import Link from "next/link";
import {
  ChangelogAccordion,
  ChangelogMarkdown,
} from "#/components/ChangelogModal/Changelog";
import { compare, splitVersionNumber } from "#/api/utils";
import { PageHead } from "#/components/PageHead/PageHead";
import { Icon } from "#/components/Icon/Icon";

export const AboutPage = () => {
  const directoryPath = path.join(process.cwd(), "public/changelog");
  const changelogFiles = fs.readdirSync(directoryPath);
  const changelogs: Record<string, string> = {};
  const currentVersionName = `${splitVersionNumber(CURRENT_APP_VERSION).major}.${splitVersionNumber(CURRENT_APP_VERSION).minor}.x`;

  changelogFiles.sort(compare);
  changelogFiles.forEach((file) => {
    const changelog = fs.readFileSync(path.join(directoryPath, file), "utf8");
    changelogs[file.replace(".md", "")] = changelog;
  });

  const currentChangelog = changelogs[currentVersionName];
  delete changelogs[currentVersionName];

  return (
    <>
      <PageHead
        title="О приложении"
        subtitle="AniX - неофициальный веб-клиент Anixart"
      />

      <div className="about-grid">
        <section className="box">
          <div className="about-logo-row">
            <Image
              src="/images/icons/icon-512x512.png"
              className="about-logo"
              alt="Логотип AniX"
              width={128}
              height={128}
            />
            <div style={{ minWidth: 0 }}>
              <h2 className="about-name">AniX</h2>
              <p className="about-ver">Версия {CURRENT_APP_VERSION}</p>
            </div>
          </div>
          <p className="about-text">
            AniX - это неофициальный веб-клиент для Android-приложения Anixart.
            Он позволяет вам получать доступ к своей учетной записи Anixart и
            управлять ею из веб-браузера компьютера или телефона. В клиенте
            доступна синхронизация с аккаунтом и управление его списками и
            избранным. А самое главное - это возможность смотреть все доступные
            аниме из базы Anixart
          </p>
        </section>

        <section className="box">
          <h3>Полезные ссылки</h3>
          <div className="about-links">
            <Link
              href={"https://t.me/anix_web"}
              target="_blank"
              className="btn g"
            >
              <Icon name="telegram" size={18} />
              Новости
            </Link>
            <Link
              href={"https://github.com/anix-org"}
              target="_blank"
              className="btn g"
            >
              <Icon name="github" size={18} />
              GitHub
            </Link>
            <Link
              href={"https://wah.su/radiquum"}
              target="_blank"
              className="btn g"
            >
              <Icon name="user" size={18} />
              Разработчик
            </Link>
          </div>

          <h3 style={{ marginTop: 18 }}>
            <span className="about-h3-ic">
              <Icon name="coin" size={18} />
            </span>
            Донат
          </h3>
          <div className="about-links">
            <Link
              href={"https://dalink.to/radiquum"}
              target="_blank"
              className="btn g"
            >
              <Image src={"/svg/donationAlert.svg"} alt="" width={16} height={16} />
              dalink
            </Link>
            <Link
              href={"https://boosty.to/radiquum"}
              target="_blank"
              className="btn g"
            >
              <Image src={"/svg/boosty.svg"} alt="" width={20} height={20} />
              boosty
            </Link>
          </div>
        </section>
      </div>

      <section className="box">
        <div className="sh">
          <h2>Список изменений</h2>
          <span className="hint">текущая версия: v{CURRENT_APP_VERSION}</span>
        </div>
        <ChangelogMarkdown content={currentChangelog} />
        <ChangelogAccordion contents={changelogs}></ChangelogAccordion>
      </section>
    </>
  );
};
