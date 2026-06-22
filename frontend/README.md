# Plantora Frontend (PWA shell)

Mobile-first billing PWA for plant shops. **Prompt 4** delivers the foundation:
design system, auth/login, role-aware routing, the shop app layout with bottom
navigation, and PWA setup. Feature screens (products, billing, sales, settings,
admin) are placeholders for later prompts.

- **Stack:** React 18 · Vite · TypeScript · Tailwind · React Router · Zustand ·
  Axios · vite-plugin-pwa · Motion (Framer Motion)
- **Design objective:** Apple's calm + Stripe's clarity, **scaled up for older
  eyes & thumbs** — 17px base type, high contrast, 48px min / 56px primary tap
  targets, obvious buttons, clear loading/error states.

## Setup

```bash
cd frontend
cp .env.example .env          # set VITE_API_BASE_URL (default http://localhost:8000)
npm install
npm run dev                   # http://localhost:5173
```

Backend must be running (prompts 1–3) and reachable at `VITE_API_BASE_URL`. Log
in with a shop owner created by the admin (`POST /admin/shops`) or the bootstrap
admin.

Scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run typecheck`.

## Design tokens & styleguide

All tokens live in `tailwind.config.ts` (`theme.extend`) and the component
classes in `src/index.css` — the single source of truth for every screen. Visit
the **dev-only** living reference at **`/_styleguide`** (only mounted in
`npm run dev`) to see colors, type scale, buttons, inputs, card and list row.

## Auth & session

- JWT obtained from `POST /auth/login`; user hydrated via `GET /auth/me`.
- Token persisted in `localStorage` so a refresh/relaunch stays logged in
  (tradeoff documented in `src/store/auth.ts`). Backend tokens are long-lived by
  design for all-day shop devices.
- Axios instance (`src/api/client.ts`) attaches the bearer token and, on **401**,
  clears the session; `ProtectedRoute` then redirects to `/login`.
- Role-aware routing: `shop_owner` → `/app/*` (bottom-nav shell, Bill is home);
  `admin` → `/admin` (minimal placeholder). Wrong-role access is redirected.

## PWA

- `vite-plugin-pwa` with `registerType: "autoUpdate"`: a new deploy updates the
  service worker in the background and activates on the **next load** (no prompt).
- Caches the **app shell** only. No offline data/billing sync (future concern).
- Manifest: name *Plantora*, standalone, portrait, brand-green theme/splash.
- **Installability** is fully testable once served over HTTPS on the VPS;
  `localhost` is treated as secure for dev. In `vite dev` the SW is disabled
  (`devOptions.enabled: false`); use `npm run build && npm run preview` to
  exercise the real service worker locally.

### Replace placeholder icons

`public/icons/*.png` and `public/favicon.svg` are **generated placeholders**
(solid brand-green leaf mark). Replace with final art at the same paths/sizes:
`icon-192.png` (192²), `icon-512.png` (512²), `maskable-512.png` (512², keep the
mark inside the ~80% safe zone), `apple-touch-icon.png` (180²).

## Phone-first

Designed at 360–400px width; content is constrained to a phone-width column and
centered on larger screens. Verify login and bottom-nav at 360px.
