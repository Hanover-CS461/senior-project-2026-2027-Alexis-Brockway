/**
 * Where emailed links should land.
 *
 * Reset links used to be built from `window.location.origin`, which meant a link
 * requested from a local dev copy came back to `http://localhost:5173/` — dead on
 * any other machine, and dead on this one as soon as `npm run dev` stops. It reads
 * as a broken link, and because recovery links are single-use the click that failed
 * also burned the token.
 *
 * Emailed links now always point at the deployed app. Both copies talk to the same
 * Supabase project (AGENTS.md §3), so resetting from the deployed app resets the
 * same password a local session would.
 *
 * Keep in sync with `base` in app/vite.config.ts and the shim in docs/404.html.
 * Override with VITE_APP_URL if the app ever moves.
 */
export const DEPLOYED_APP_URL =
  'https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/app/'

export function emailLinkTarget(): string {
  return import.meta.env.VITE_APP_URL || DEPLOYED_APP_URL
}
