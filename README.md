# Idle GIF Zapper

A Vite + React + TypeScript app that feels like an old CRT television auto-zapping through random Giphy channels.

## Setup

1. **Clone / open the project**

2. **Create your env file**

   ```bash
   cp .env.example .env.local
   ```

3. **Add a Giphy API key**

   - Create a free key at [developers.giphy.com](https://developers.giphy.com/)
   - Set it in `.env.local`:

   ```env
   VITE_GIPHY_API_KEY=your_giphy_api_key_here
   ```

4. **Install & run**

   ```bash
   npm install
   npm run dev
   ```

   Open the URL Vite prints (usually `http://localhost:5173`).

## Controls

| Input | Action |
| --- | --- |
| **Pause / Play** button or `Space` | Pause or resume auto-zap |
| **Next** button or `→` | Jump to the next channel immediately |

Channels advance every ~4.5 seconds with a crossfade. Images are preloaded before they appear. Failed API calls retry automatically after a short delay without blanking the screen.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run oxlint |

## Deploy on Vercel

1. Push the repo to GitHub / GitLab / Bitbucket.
2. Import the project in [Vercel](https://vercel.com/).
3. Framework preset: **Vite** (auto-detected).
4. Add the environment variable `VITE_GIPHY_API_KEY` in the Vercel project settings.
5. Deploy — no `vercel.json` required; the default Vite build (`npm run build` → `dist`) works out of the box.

## Project structure

```
src/
  App.tsx                 # Layout / composition
  components/
    TVScreen.tsx          # GIF screen, crossfade, scanlines / vignette
    Hud.tsx               # Channel number, title, progress bar
    Controls.tsx          # Pause / Next
  hooks/
    useGifChannel.ts      # Fetch, timer, preload, pause, retry
  lib/
    giphy.ts              # Typed Giphy Random API client
```

## Notes

- API key is read via `import.meta.env.VITE_GIPHY_API_KEY` — never hardcode it.
- `.env.local` is gitignored (Vite `*.local` pattern). Commit `.env.example` only.
