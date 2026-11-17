// Demo access is a build-time decision, not a runtime one.
//
// Two published logins let a visitor with no account look around — and they are
// the same two accounts the browser tests sign in as. That is fine on fictional
// demo data, and unacceptable once real manuscripts arrive: a published Chief
// Editor can read `authors`, so a stranger would be one click from every writer's
// name and email (issue #7).
//
//   dev server       → on, so nothing needs configuring locally
//   production build → VITE_DEMO_MODE must be set explicitly to "true" or
//                      "false"; vite.config.ts fails the build otherwise, so
//                      "nobody remembered the flag" cannot silently ship either
//                      answer
//
// Turning this off must remove the credentials from the bundle, not merely hide
// the box — a hidden box is still a published password to anyone who reads the
// JavaScript. Verify with:
//
//   npm run build
//   grep -c 'kennings.chief@example.com' dist/assets/*.js    # must print 0
//
// `.env.production` sets it to true for the graded demo build.
export const DEMO_ACCESS_ENABLED =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== 'false')
