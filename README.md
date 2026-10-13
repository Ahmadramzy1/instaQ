<div align="center">

# instaQ

**Instagram link queue for Kick chat** — plays Reels and posts in the order viewers send them.

**English** · [فارسی](README.fa.md)

*Dedicated to the good People of Iran*

</div>

---

instaQ connects to [Kick](https://kick.com) chat and queues Instagram, YouTube and TikTok links using the existing source filters and playback rules. The static app uses `instaQ.html` and `kick-realtime.js`; a small Cloudflare Worker handles public Centrifugo chat tokens and WebSocket relay. No build step or npm dependencies are required.

## Features

- **Login screen** — enter a channel name or Kick channel URL; once connected you land on the main page (the channel and chatroom ID are not shown there).
- **Automatic link detection** — Reels, posts, IGTV and `/share/` links, with or without `https://`. Duplicates are skipped. Stories can't be played in-page, so they get an "Open in Instagram" button.
- **Ordered queue** — links play in the order they were sent; the queue holds up to 150 items and is saved in the browser, so it survives a refresh.
- **Direct video playback** — several mirrors and Instagram's embed are tried in parallel, the first working source wins, and failed items retry once automatically. If nothing works, the page falls back to Instagram's own embedded player.
- **Full-height player** — the info bar and controls float over the video and fade out when the mouse leaves the player (after 1 second) or stays idle (3 seconds).
- **Player controls** — seekable timeline with hover time, previous / next, ±5 s, play / pause, speed (1× / 1.25× / 1.5× / 2×), loop, autoplay, mute, fullscreen.
- **Queue tools** — "unseen only" filter, "freeze intake", remove single items, clear watched, clear all.
- **Limits (bottom bar)** — **Intake limit** (max total links allowed in) and **Per-user link limit** (max links from one user in the queue at a time). The per-user cap only counts unseen links; the queue survives refresh with only unseen items re-processed.
- **Dusk theme** — a dark-only glass-panel design with blue accent (`#6aa8ec`), Unbounded and JetBrains Mono fonts, SVG icons, mouse light on queue, glowing ring around live player, custom cursor (disabled over video and on touch devices), and a WebGL-animated login background. Effects respect `prefers-reduced-motion`. 3D card tilt has been removed.
- **Fonts** — Vazirmatn for Persian text, Unbounded for headings, JetBrains Mono for numbers and the repo link.

## Usage

1. [Open instaQ online](https://ahmadramzy1.github.io/instaQ/) in a modern browser, or host the app on the HTTPS origin configured in your Worker.
2. Type the Kick channel name or URL and press **Connect**.
3. Links that appear in chat start playing automatically.

### OBS and direct channel links

Add `?c=CHANNEL_NAME` to the URL to connect to a channel automatically, for example `https://ahmadramzy1.github.io/instaQ/instaQ.html?c=CHANNEL_NAME`. Replace `CHANNEL_NAME` with the Kick channel slug. Use this URL as an OBS Browser Source. The short `/instaQ/` URL also preserves the channel parameter when redirecting.

### Browser storage

The queue and settings use `localStorage` keys prefixed with `instaq:` so they do not collide with generic keys used by other projects on the same GitHub Pages domain. They survive page refreshes and site updates unless browser storage is cleared. Chrome, OBS and mobile browsers each keep their own data; local-file data does not transfer to the online site.

Older versions used unprefixed keys. This version starts with a fresh queue and settings; it neither imports nor deletes those old keys because they may belong to another app sharing the domain.

### Recent fixes and design

- **Embed timeout** — when an Instagram embed player is shown, autoplay now continues to the next link after 60 seconds (unless loop is on).
- **Per-user cap** — only counts unseen links; seen links don't block the user.
- **Refresh behavior** — only unseen links are re-processed after refresh.
- **Dusk redesign** — dark-only, glass panels, blue accent, custom mouse light and glowing ring, WebGL login background, SVG icons, Unbounded + JetBrains Mono fonts. Light theme and 3D card tilt removed.

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

The ⚙ menu includes **Reconnect chat**, **Change channel**, **Clear watched** and **Clear entire list**. The login screen also offers reconnect. Source selections, intake limits, per-user limits, Data Saver and queue storage are preserved.

## How it works

- A standalone Worker resolves the channel slug and requests Kick's current Centrifugo connection descriptor and an anonymous connection token.
- The browser connects through the Worker's restricted WebSocket relay and subscribes to `chatrooms.<roomId>.v2`.
- `ChatMessageEvent` publications are normalized and passed to the existing `scan()` function; Instagram, YouTube, TikTok, vt and vm parsing remains unchanged.
- Heartbeats, token refresh and reconnect are handled by `kick-realtime.js`. Message IDs are deduplicated in the app.
- The player, queue and settings stay in the browser. A temporary chat disconnect does not clear or lock an existing queue.

## Deploy the chat Worker

1. Create a Cloudflare Worker named `instaq-chat` and deploy `worker/worker.mjs`.
2. Set the Text variable `SITE_ORIGIN` to `https://ahmadramzy1.github.io` (or your own app origin, without a path or trailing slash). No secrets or bindings are required.
3. Set the `worker` URL in `kick-realtime.js` to your deployed URL. This deployment uses `https://instaq-chat.ahmadamj79.workers.dev`.
4. Check `/health`, then connect using a channel slug or Kick URL. Numeric chatroom IDs and local file origins are not supported by this gateway.

[Developer guide with complete code](docs/kick-chat-guide.html)

## Known limitations

- It relies on third-party services (Kick's API, CORS proxies, Instagram mirrors). If one of them changes or goes down, resolving can fail — try the retry button or the Instagram player fallback.
- Kick website realtime endpoints are internal and may change. The UI displays connection errors and received-message counts; use reconnect after resolving network or gateway errors.
- Depending on your network, a VPN may be needed for some sources.
- Stories can't be played in the page.
