# Our Cinema

A tiny private streaming room for two. React + TypeScript + Vite + Tailwind + Framer Motion, with Supabase for the current episode. No login, no accounts.

## 1. Install
```bash
npm install
```

## 2. Environment variables
```bash
cp .env.example .env
```
Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase → Project Settings → API). Use the publishable/anon key only. Never put a service-role key in this project.

## 3. Connect Supabase
Create the project yourself, then paste the two values above. The app only reads data.

## 4. Storage
Create a bucket called `videos` (or change `VITE_VIDEO_BUCKET`).
- **Private bucket** (default): `VITE_BUCKET_IS_PUBLIC=false`. The app requests 6-hour signed URLs. Needs the storage policy in `supabase/schema.sql`.
- **Public bucket**: `VITE_BUCKET_IS_PUBLIC=true`.

Honest note: with no login, anyone who knows the site URL can watch. A private bucket keeps files unlisted, not secret. If that is not enough, put a password in front of the site (for example Vercel password protection) or add a shared passcode later.

Video: upload an **MP4 (H.264 + AAC)** with the moov atom at the start (`ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4`). Supabase Storage supports range requests, so the browser only downloads what it plays. Check your plan's per-file upload limit.

## 5. Database
Run `supabase/schema.sql` in the SQL editor. It creates `episodes`, a one-current-episode guarantee, and read-only RLS.

Replacing the episode: upload the new files, confirm they play, run the publish snippet at the bottom of `schema.sql`, then delete the old file.

## 6. Run locally
```bash
npm run dev
```

## 7. Build
```bash
npm run build     # type-checks, then builds to dist/
npm run preview
```

## 8. Deploy to Vercel
Push to GitHub → Import the repo in Vercel (Vite is auto-detected) → add the `VITE_*` variables in Project Settings → Deploy.

## Notes
- Intro copy and its timing live in `src/content.ts`. The intro plays once per device; “Replay intro” is in the footer.
- Resume position is stored in `localStorage` per episode id.
- The service worker caches the app shell only. Video is never cached, so there is no offline playback.
- Player keys: Space/K play, ←/→ ±5s, J/L ±10s, ↑/↓ volume, M mute, F fullscreen, Esc back.
- Reduced motion: decorative motion is removed; the intro becomes a simple fade.
