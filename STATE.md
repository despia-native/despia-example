# despia-example state — the PRODUCTION example (the owner's gate, 2026-08-17)

Goal: this repo is THE example AND the boilerplate — what the Expo community starter
templates are to Expo (owner, 2026-08-17): a real deployed app at
https://exampleapp.despia.com with auth, profile management, account deletion, settings,
a gated app area, adaptive mobile/tablet UI, installable PWA, SSR landing page, and
animations — one set of documents rendering native iOS, native Android, and web. Built and
deployed only through the open toolchain (`dsx`). This gates the launch checklist in the
monorepo's WHATS-LEFT.md.

Acceptance:

```
 1. [x] Public SSR landing at `/` with entry animations; `/about` public
        verified: curl / -> pre-rendered content; shots/01-landing-phone.png
 2. [~] Sign in + sign out + refresh live-verified (curl + browser walk: login 200,
        cookie-only refresh -> fresh token, logout clears). Sign-UP is coded and answers
        the confirm-email branch; instant signup awaits the operator's email decision
        (OPERATOR.md step 5: confirmations off, or real SMTP)
 3. [x] /notes + /notes/:id gated; API rows answer 401 anonymously
        verified: curl anonymous -> 401 typed envelope; browser walk signed in
 4. [x] Real backend: server/notes.dsx compiled into worker/app.ts rows; dsx_note live
        on the Supabase project (RLS enabled)
        verified: A creates -> row; B lists -> []; B gets A's id -> null; B PATCH -> null
        and the row untouched; owner PATCH -> row updated
 5. [x] Animations declared in the documents (enter=/transition=/anim curves)
        verified: in the shipped .dsx files; web walk screenshots
 6. [x] Only `dsx` + documented seams; worker on @despia/server
        verified: dsx lint --strict 0/0; dsx build green (94 files incl. PWA manifest);
        worker/index.ts on createWorkersHandler; wrangler.jsonc staged
 7. [ ] Live on exampleapp.despia.com   [gated] -> OPERATOR.md steps 1-4
 8. [x] README reads as the bootstrap    verified: rewritten (piece map, run, export, copy story)
 9. [x] Profile screen: name + password self-serve via /auth/profile
        verified: live probe (name persisted in GoTrue) + shots/04-profile-phone.png
10. [~] Delete account: confirm sheet + /auth/delete-account shipped; the unconfigured
        branch answers a clean 503 (live-verified). The configured path runs the first
        deploy with SUPABASE_SERVICE_KEY (OPERATOR.md step 3) — re-probe then
11. [~] Settings screen shipped with the dark toggle + about rows (shots/05). OPEN:
        whether global.settings.dark actually flips the web theme is unverified — check
        the defaults plane's web wiring, or wire it, before calling this done
12. [x] Adaptive: tab shell everywhere; 390px rows push the detail screen, 1024px the
        same rows select into the split editor (seeded, saves round-trip into the list)
        verified: WALK OK with in-walk assertions; shots/03 + /06
13. [~] PWA: dsx build now emits manifest.webmanifest (standalone) + SVG identity icon,
        every page links it (framework change, tests in the monorepo); walk fetches it
        live. OPEN: the offline service worker — not yet emitted
```

Decisions (locked):

- Supabase project: `hforkizbesezccnbeqjh` (ACTIVE_HEALTHY, us-east-2). Identity =
  `auth_mode jwks`, `auth_jwks_url https://hforkizbesezccnbeqjh.supabase.co/auth/v1/.well-known/jwks.json`
  (probed 200, ES256). No verification secret exists anywhere.
- Auth shell (login/signup/refresh/logout) is a small TypeScript handler set in
  `worker/index.ts` calling GoTrue server-side (SUPABASE_URL + SUPABASE_ANON_KEY as env),
  setting the refresh token as an HttpOnly SameSite=Lax cookie and returning the access
  token to the page. Bearer stays the ONLY carrier on data routes (identity.ts law). The
  TS hatch is the sanctioned path (writing-a-backend.md "that path never went away");
  data routes stay pure declared CRUD.
- `server/notes.dsx` is checked in as the SOURCE OF TRUTH; `worker/index.ts` carries the
  compiled form (route rows + crud wiring) until F1 lands. The file and the rows must not
  drift — F1 removes the duplication.
- Session on page: store variable `session` seeded at boot by App shell calling
  /auth/refresh; gated screens guard on it and route.replace('/signin') when absent.
- Postgres access: node bootloader locally via DSX_DATABASE_URL (Supabase pooler);
  Workers deploy via Hyperdrive binding (bootloader-workers maps it) [operator creates the
  Hyperdrive config with the CF token, one command, staged in OPERATOR notes].

Follow-ups (named, monorepo work, not this repo):
- F1: `dsx` grows the server-document compile step (TS twin of server_document.rb +
  emitter): `dsx build` reads server/*.dsx and emits the route/action/migration artifacts
  the worker imports. Kills the compiled-form duplication above.
- F2: session/token persistence as a first-class three-renderer primitive for NATIVE
  surfaces (web is covered by the HttpOnly cookie pattern).
- F3: npm 0.0.1 publish flips this repo's CI from tarballs to the registry.

Progress: 8/13 verified, 4 part-verified with the open half named, 1 operator-gated (screens + server doc + auth shell written and pushed, nothing
probed yet). Worker-API facts established by reading @despia/server source, for the rework
of worker/index.ts (its current form GUESSES the config shape and will not boot):

- Real signature: `createWorkersHandler(config: HostConfig, serverConfig: ServerConfig,
  options: WorkersHandlerOptions)`. HostConfig = { routes, handlers } where a route row's
  `action` = "module.action" resolved into handlers[module][action].
- Declared CRUD: handlers are `crudHandler("note", "list")` etc. (src/repo.ts; the emitted
  form is generated/modules/server.http/crud.generated.ts — copy that shape). Entities
  install via `options.entities` as EntitySpec[]: `{ entity: "note", fields: { title:
  "text", body: "text" }, ownership: "owner" }` (fields is Record<string,string>, NOT an
  array). UNVERIFIED: whether crudHandler/installEntities are on the public package export
  surface — if not, F1 grows @despia/server's exports (one line) before the worker can
  import them.
- Data provider: the monorepo boots via generated-loader (loadGenerated +
  installConfiguredDataProvider). Standalone: bootloader-node accepts
  `opts.installDataProvider(env)`; workers accepts `options.dataProviders` +
  `options.backendSetting`. The postgres provider lives in
  Core/Server/Providers/Postgres/web/server/ (loads pg lazily). For local verification
  use bootloader-node with DSX_DATABASE_URL (Supabase pooler); wrangler deploy maps
  Hyperdrive.
- Identity: `createIdentityResolver(envFn)` is built by the bootloader; env DSX_JWT_*
  names come from Core/Server config.json rows (auth_mode jwks + auth_jwks_url probed
  working, ES256).

Next, in order:
1. Rework worker/index.ts to the real API above; add missing public exports to
   @despia/server if needed (monorepo change, rides F1's direction).
2. npm install from packed tarballs (despia-docs pattern: pack workspace, install, keep
   package.json registry-pinned on commit); dsx build + dsx lint green.
3. Apply the RLS migration to hforkizbesezccnbeqjh via the Supabase MCP
   (shape: packages/server/deploy/supabase/migrations/000_dsx_schema.sql — dsx_note
   table already matches this entity; confirm with list_tables first).
4. Boot bootloader-node locally with SUPABASE_URL/SUPABASE_ANON_KEY/DSX_JWT_MODE=jwks/
   DSX_JWT_JWKS_URL/DSX_DATABASE_URL; live probe: signup A + B, create as A, list as B
   -> [], anonymous -> 401. (Supabase email confirmations may need disabling on the
   project for password signup to return a session — check auth settings via dashboard;
   if gated, use two pre-created users via MCP instead.)
5. Screenshots (Chromium is preinstalled; DSX_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium
   if playwright revisions mismatch), README rewrite, wrangler.jsonc, OPERATOR handoff
   (CF token + DNS + Hyperdrive).
