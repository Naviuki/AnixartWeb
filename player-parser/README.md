# AniX - Player Parsers

This sub-project allows obtaining direct video file links from sources Sibnet, Kodik, Anilibria (source: libria)

It used to live in the separate [anix-player-parser](https://github.com/AniX-org/anix-player-parser) repository. That repository is archived, so the code now lives here, inside the main AniX project, and is kept in sync with the site.

In the main project, the parsers are used to operate the internal player. The local launcher (`npm run local` / the "AniX (локально)" shortcut) starts this service automatically on `http://127.0.0.1:7000`. If this function is not important to you, you may skip it: the site keeps working and the inline player falls back to the source's own iframe.

License: [MIT](./LICENSE)

## Usage

In the web browser address bar, enter:

`<http|https>://<ip|domain><:port>/?url=<VIDEO_URL>&player=<PLAYER_SOURCE>`

and `GET /health` answers `{"ok":true,...}` without contacting the sources.

The service listens on `127.0.0.1` by default. Set `HOST=0.0.0.0` to expose it on the network.
Successful lookups are cached for 30 minutes.

where:

- http|https - the scheme used to connect to the service
- ip|domain - IP address or domain where the service is hosted
- :port - service port, optional
- VIDEO_URL - the link to the video from the source
- PLAYER_SOURCE - the source, one of: kodik, sibnet, libria

Response:

- 500|400: an error occurred, see the `message` field in the response body for details
- 200: request was successful

## Deployment

> [!IMPORTANT]
> Due to the nature of the sources, it is recommended to use a virtual server in Russia, as they may be inaccessible from other countries.
>
> Because of this specificity, the parsers cannot be deployed on edge services like Cloudflare Workers or Deno, only on a dedicated server.

### Docker

Requirements:

- [docker](https://docs.docker.com/engine/install/)

### Pre-built

1. Run the command:

`docker run -d --name anix-player -p 7000:7000 radiquum/anix-player-parser:latest`

### Manual build

Additional Requirements:

- [git](https://git-scm.com/)

1. Clone the repository `git clone https://github.com/Radiquum/AniX`
2. Navigate to the repository directory `cd AniX`
3. Navigate to the parsers directory `cd player-parsers`
4. Run the command `docker build -t anix-player-parser .`
5. Once finished, run the command: `docker run -d --restart always --name anix-player -p 7000:7000 anix-player-parser`

### docker/Legend

- -d - run container in the background
- --restart always - always restart after server reboot
- --name - container name
- -p - container port accessible externally. PORT:7000

### docker/After deployment

The service will be available at: `http://<YOUR IP><:YOUR PORT>/`

### docker/Note

To use your own domain and support the HTTPS protocol, you can use Traefik or another reverse-proxy with an SSL certificate.

Useful links:

- [Docker run to docker compose syntax converter](https://it-tools.tech/docker-run-to-docker-compose-converter)
- [How to setup Traefik + custom domain + SSL](https://letmegooglethat.com/?q=how+to+setup+traefik+with+custom+domain+and+ssl+certificate+from+lets+encrypt%3F)

### pm2

Requirements:

- [git](https://git-scm.com/)
- [nodejs 23+ with npm](http://nodejs.org/)
- [pm2](https://pm2.keymetrics.io/)

Instructions:

1. Clone the repository `git clone https://github.com/Radiquum/AniX`
2. Navigate to the repository directory `cd AniX`
3. Navigate to the parsers directory `cd player-parsers`
4. Run the command `npm install`
5. Once finished, run the command `pm2 start index.ts -n anix-player-parser`

### pm2/Legend

- -n - service name in pm2

### pm2/After deployment

The service will be available at: `http://<YOUR IP>:7000/`

### pm2/Note

To enable automatic application start, it is recommended to configure pm2 to start on boot with the command: `pm2 startup`

Useful links:

- [PM2: smart approach to process management @ Habr](https://habr.com/ru/articles/480670/)
