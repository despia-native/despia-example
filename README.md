# Field Notes, the Despia starter

One codebase. A native iOS app, a native Android app, an installable web app, and a
server-rendered landing page, all from the `.dsx` documents in this repository. This is
the boilerplate a real project starts from: authentication, a gated app area, profile
management, account deletion, settings, a real backend with row-level security, adaptive
phone and tablet layouts, and animations that ride the documents onto every renderer.

Live at https://exampleapp.despia.com

## What is in the box

| Piece | Where | What it shows |
|---|---|---|
| Landing page | `Components/App.dsx` | public, server-rendered, entry animations |
| Sign in / sign up | `Components/SignIn.dsx` | the form grammar, real sessions, an HttpOnly refresh cookie |
| The app shell | `Components/Home.dsx` | the platform tab bar (Notes, Profile, Settings), session guard |
| Notes | `Components/Notes.dsx` | list + create + edit + delete over declared CRUD; phone rows push a detail screen, tablet width turns the same rows into a split view |
| Profile | `Components/Profile.dsx` | display name, password change, sign out, delete account behind a confirm sheet |
| Settings | `Components/Settings.dsx` | the app-wide preference store, about links |
| The backend | `server/notes.dsx` | the ENTIRE data layer: one entity, five routes, `auth="required"`, ownership enforced by the database (RLS), no handler code |
| The worker | `worker/app.ts` + `worker/index.ts` | the compiled form of the server document + the auth shell, on `@despia/server`; `worker/local.ts` is the dev twin (node + PGlite, real Supabase auth) |

## Run it

```sh
npm install
npm run dev          # the web app, live reload
npm run lint         # strict static validation
npm run build        # the deployable site (SSR pages, PWA manifest, hydrating client)
node --env-file=.env worker/local.ts   # the full stack locally: real auth, real RLS semantics
```

`.env` needs `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable), `DSX_JWT_MODE=jwks`,
`DSX_JWT_JWKS_URL` (the project's JWKS endpoint). No verification secret exists anywhere:
identity is ES256 tokens checked against the provider's public keys.

## Two ways to a native app, same sources

The Despia build lanes compile and sign iOS and Android for the stores. Or export a
project you own outright:

```sh
npm run export       # a real Xcode project + a real Android Studio project into export/
```

(Set `DSX_KERNEL` to a clone of
[despia-kernel](https://github.com/despia-native/despia-kernel); the
[native export guide](https://github.com/despia-native/despia/blob/main/Documentation/guides/native-export.md)
has the details.)

## Copy this repo

This layout is the canonical starter shape: rename the scheme in `dsx.json`, keep the
folder grammar, and everything (the toolchain, the export, the deploy) keeps working. The
[combination matrix](https://github.com/despia-native/despia/blob/main/Documentation/guides/combinations/README.md)
documents every other way of pairing Despia with an existing stack; the
[reserved-directory contract](https://github.com/despia-native/despia/blob/main/Documentation/guides/reserved-directories.md)
is the short promise about what the tools may touch.

Deployment (Cloudflare worker + Hyperdrive + the custom domain) is one config:
`wrangler.jsonc`; the identity-bound steps live in `OPERATOR.md`.

Issues and discussions: [despia-native/despia](https://github.com/despia-native/despia/issues),
the single tracker for the whole framework.
