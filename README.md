<div align="center">

# instaQ

**Instagram link queue for Kick chat** — plays Reels and posts in the order viewers send them.

**English** · [فارسی](README.fa.md)

*Dedicated to the good People of Iran*

</div>

---

instaQ is a single-file web app that connects to a [Kick](https://kick.com) chat, picks out every Instagram link viewers post, and plays the videos one after another in a full-height player. No build step, no server, no dependencies: just one HTML file.

## Features

- **Login screen** — enter a channel name or a numeric chatroom ID; once connected you land on the main page (the channel and chatroom ID are not shown there).
- **Automatic link detection** — Reels, posts, IGTV and `/share/` links, with or without `https://`. Duplicates are skipped. Stories can't be played in-page, so they get an "Open in Instagram" button.
- **Ordered queue** — links play in the order they were sent; the queue holds up to 150 items and is saved in the browser, so it survives a refresh.
- **Direct video playback** — several mirrors and Instagram's embed are tried in parallel, the first working source wins, and failed items retry once automatically. If nothing works, the page falls back to Instagram's own embedded player.
- **Full-height player** — the info bar and controls float over the video and fade out when the mouse leaves the player (after 1 second) or stays idle (3 seconds).
- **Player controls** — seekable timeline with hover time, previous / next, ±5 s, play / pause, speed (1× / 1.25× / 1.5× / 2×), loop, autoplay, mute, fullscreen.
- **Queue tools** — "unseen only" filter, "freeze intake", remove single items, clear watched, clear all.
- **Limits (bottom bar)** — **Intake limit** (max total links allowed in) and **Per-user link limit** (max links from one user in the queue at a time). The current values are shown on the buttons.
- **Themes and languages** — dark / light theme and Persian (RTL) / English UI.

## Usage

1. [Open instaQ online](https://ahmadramzy1.github.io/instaQ/) in a modern browser, or download `instaQ.html` and open it locally.
2. Type the Kick channel name (or chatroom ID) and press **Connect**.
3. Links that appear in chat start playing automatically.

### OBS and direct channel links

Add `?c=CHANNEL_NAME` to the URL to connect to a channel automatically, for example `https://ahmadramzy1.github.io/instaQ/instaQ.html?c=CHANNEL_NAME`. Replace `CHANNEL_NAME` with the Kick channel name or numeric chatroom ID. Use this URL as an OBS Browser Source. The short `/instaQ/` URL also preserves the channel parameter when redirecting.

### Browser storage

The queue and settings use `localStorage` keys prefixed with `instaq:` so they do not collide with generic keys used by other projects on the same GitHub Pages domain. They survive page refreshes and site updates unless browser storage is cleared. Chrome, OBS and mobile browsers each keep their own data; local-file data does not transfer to the online site.

Older versions used unprefixed keys. This version starts with a fresh queue and settings; it neither imports nor deletes those old keys because they may belong to another app sharing the domain.

### Publishing updates

GitHub Pages is already enabled for this repository. In **Settings → Pages**, use **Deploy from a branch**, branch **main**, folder **/ (root)**. Changes pushed or merged to `main` are published automatically; check the **pages build and deployment** run in Actions for the result. No build step is needed. A cached version may remain visible briefly after deployment; reload without cache if necessary.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `←` / `→` | Seek −5 s / +5 s |
| `N` / `P` | Next / previous |
| `M` | Mute |
| `F` | Fullscreen |
| `Del` | Remove current item |

## Settings

The ⚙ menu has **Change channel**, **Clear watched** and **Clear entire list**. A custom video resolver URL (`{t}` = type, `{c}` = post code) and a custom Pusher app key are still supported in the code but their buttons are hidden; the Pusher key link on the login screen stays available.

## How it works

- The channel name is resolved to a chatroom ID through Kick's public API (via CORS proxies) and cached locally.
- Chat messages arrive over a Pusher WebSocket subscribed to `chatrooms.<id>.v2`, with automatic reconnect and backoff.
- Instagram links are matched with a regular expression, then resolved to a direct video URL through public mirrors and the Instagram embed page.
- Everything runs client-side; settings and the queue live in `localStorage`.

## Known limitations

- It relies on third-party services (Kick's API, CORS proxies, Instagram mirrors). If one of them changes or goes down, resolving can fail — try the retry button or the Instagram player fallback.
- If Kick closes the chat gateway (error `4001`), the Pusher key has probably changed; set a new one from the login screen.
- Depending on your network, a VPN may be needed for some sources.
- Stories can't be played in the page.
