# Idle GIF Zapper

A Vite + React + TypeScript app that feels like an old CRT television auto-zapping through random GIF channels (powered by the [Klipy](https://docs.klipy.com/) trending API).

## Setup

1. **Clone / open the project**

2. **Create your env file**

   ```bash
   cp .env.example .env.local
   ```

3. **Add a Klipy API key**

   - Create a free partner key at [partner.klipy.com](https://partner.klipy.com/)
   - Set it in `.env.local`:

   ```env
   VITE_KLIPY_API_KEY=your_klipy_api_key_here
   ```

   The test key from the partner panel is limited (about 100 calls/hour). The app fetches trending GIFs in batches (`per_page=50`) and picks randomly client-side, so it stays well within that budget.

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

Channels advance every ~4.5 seconds with a crossfade. Images are preloaded before they appear. Failed batch fetches retry automatically after a short delay without blanking the screen.

### Modes (HUD)

| Mode | Behavior |
| --- | --- |
| **Zap** | Trending batch, random channel hop (default) |
| **Search** | Type a query (aliases like `tmnt` expand locally); empty field falls back to trending |
| **Presets** | Chip buttons for curated queries (`src/lib/presets.ts`) |

Search aliases live in `src/lib/aliases.ts` and are easy to extend.

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
4. Add the environment variable `VITE_KLIPY_API_KEY` in the Vercel project settings (and remove any old `VITE_GIPHY_API_KEY` if present).
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
    useGifChannel.ts      # Batch cache, modes, random pick, timer, preload, pause, retry
  lib/
    klipy.ts              # Typed Klipy trending + search client
    aliases.ts            # Search abbreviation map
    presets.ts            # Preset chip config
```

## Notes

- API key is read via `import.meta.env.VITE_KLIPY_API_KEY` and placed in the request path (`/api/v1/{KEY}/gifs/trending`) — never hardcode it.
- There is no Klipy “random” endpoint; randomness is simulated client-side from a cached trending batch, with background page prefetch when the unused pool runs low.
- `.env.local` is gitignored (Vite `*.local` pattern). Commit `.env.example` only.
