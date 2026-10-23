# AniX - Unofficial Web Client for Anixart

AniX is an unofficial web client for the Android application Anixart. It allows you to access and manage your Anixart account from a web browser on your desktop or laptop computer.

## Disclaimer

Please note that AniX is an unofficial project and is not affiliated with the developers of Anixart. It is recommended to use the official Anixart app for the most up-to-date features and functionality.

---

[[RU] ПРОЧТИ МЕНЯ](./README.RU.md) | [[EN] README](./README.md)

[[RU] РАЗВЁРТЫВАНИЕ](./DEPLOYMENT.RU.md) | [[EN] DEPLOY](./DEPLOYMENT.md)

[[RU] Changelogs](./public/changelog)

---

## Screenshots

<details>
<summary>Pages Short</summary>

![Pages Short Screenshot](./docs/images/shortPageView.jpg)

</details>

<details>
<summary>Pages Full</summary>

![Pages Full Screenshot](./docs/images/fullPageView.jpg)

</details>

<details>
<summary>Search Page</summary>

![Search Page Screenshot](./docs/images/SearchPageView.jpg)

</details>

<details>
<summary>Release Page</summary>

![Release Page Screenshot](./docs/images/ReleasePageView.jpg)

</details>

<details>
<summary>User Page</summary>

![User Page Screenshot](./docs/images/ProfilePageView.jpg)

</details>

## Public demo

> [!WARNING]
> I don't responsible for your account, use the public instances at your discretion, otherwise deploy one yourself!

- https://anixart.netlify.app/ (No sub-services)
- https://anix.0x174.su/ (Full deploy, Login: anime, Pass: just_watch)

## Local hosting (on your PC)

The site can run fully locally — your own computer acts as the server for the Anixart API:

1. Install [Node.js 18+](https://nodejs.org).
2. Clone the repository and run `start-local.cmd`: dependencies are installed automatically on first launch, the server starts and the browser opens at `http://localhost:3000`.
3. To add a desktop shortcut, run `scripts\create-desktop-shortcut.cmd`.

From the console: `npm install && npm run local`. No environment variables are required: requests to the Anixart API (`/api/proxy/*`) are handled by the built-in `middleware.ts` on your PC.

> [!NOTE]
> Built-in player sources (kodik/libria/sibnet) require the separate [player-parser](https://github.com/AniX-org/anix-player-parser) service — without it the player reports "Player is not configured"; the rest of the site is unaffected.

See [AGENTS.md](./AGENTS.md) for AI-agent rules, architecture and local-mode requirements.

## Contributing

We welcome contributions to this project! If you have any bug fixes, improvements, or new features, please feel free to create a pull request.
