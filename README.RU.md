# AniX - Неофициальный веб клиент для Anixart

AniX - это неофициальный веб-клиент для Android-приложения Anixart. Он позволяет вам получать доступ к своей учетной записи Anixart и управлять ею из веб-браузера на вашем настольном компьютере или ноутбуке.

## Отказ от ответственности

Пожалуйста, обратите внимание, что Anix является неофициальным проектом и не связан с разработчиками Anixart. Рекомендуется использовать официальное приложение Anixart для получения наиболее актуальных функций.

---

[[RU] ПРОЧТИ МЕНЯ](./README.RU.md) | [[EN] README](./README.md)

[[RU] РАЗВЁРТЫВАНИЕ](./DEPLOYMENT.RU.md) | [[EN] DEPLOY](./DEPLOYMENT.md)

[[RU] Списки изменений](./public/changelog)

---

## Скриншоты

<details>
<summary>Короткий вид страниц</summary>

![Скриншот Короткого вида страниц](./images/shortPageView.jpg)

</details>

<details>
<summary>Полный вид страниц</summary>

![Скриншот Полного вида страниц](./images/fullPageView.jpg)

</details>

<details>
<summary>Страница поиска</summary>

![Скриншот Страницы поиска](./images/SearchPageView.jpg)

</details>

<details>
<summary>Страница релиза</summary>

![Скриншот Страницы релиза](./images/ReleasePageView.jpg)

</details>

<details>
<summary>Страница пользователя</summary>

![Скриншот Страницы пользователя Screenshot](./images/ProfilePageView.jpg)

</details>

## Готовый Docker-образ (GitHub Container Registry)

Образ собирается автоматически при каждом пуше в ветку `V3` и публикуется в GHCR:

```bash
docker run -d --restart always --name anix -p 3000:3000 ghcr.io/naviuki/anixartweb:latest
```

- теги: `latest` и `<версия>-<дата>`, например `3.10.3-31-10-2026`
- исходники workflow: [`.github/workflows/publish-ghcr.yml`](./.github/workflows/publish-ghcr.yml)
- подробнее: [[RU] РАЗВЁРТЫВАНИЕ](./DEPLOYMENT.RU.md#github-container-registry)

> [!NOTE]
> GitHub Pages для этого клиента не подходит: он умеет отдавать только статические
> файлы, а приложению нужен сервер (динамические маршруты `/release/[id]`,
> `/profile/[id]`, middleware-прокси `/api/proxy/*`). Для живого адреса используйте
> Vercel, Netlify, Docker или локальный запуск.

## Публичные демо

> [!WARNING]
> Я не несу ответственности за ваш аккаунт, используйте публичные инстансы на свой риск, иначе деплойте свой!

- https://anixart.netlify.app/ (Без доп. сервисов)
- https://anix.wowlikon.tech/ (Полный деплой, Логин: anime, Пароль: just_watch)

## Локальный запуск (на вашем ПК)

Сайт работает полностью локально — сервером для связи с API Anixart служит ваш собственный компьютер:

1. Установите [Node.js 18+](https://nodejs.org).
2. Склонируйте репозиторий и запустите `start-local.cmd`: при первом запуске зависимости установятся автоматически, сервер поднимется и откроется браузер с `http://localhost:3000`.
3. Чтобы добавить ярлык на рабочий стол, выполните `scripts\create-desktop-shortcut.cmd`.

Из консоли то же самое: `npm install && npm run local`. Переменные окружения не нужны: запросы к API Anixart (`/api/proxy/*`) обрабатывает встроенный `middleware.ts` на вашем ПК.

> [!NOTE]
> Встроенные источники плеера (kodik/libria/sibnet) требуют отдельного сервиса [player-parser](https://github.com/AniX-org/anix-player-parser) — без него плеер сообщает «Плеер не настроен», на остальную работу сайта это не влияет.

Правила, архитектура и требования к локальному режиму для ИИ-агентов описаны в [AGENTS.md](./AGENTS.md).

## Внесение вклада

Мы приветствуем вклад в этот проект! Если у вас есть какие-либо исправления ошибок, улучшения или новые функции, пожалуйста, не стесняйтесь отправлять запрос на обновление.
