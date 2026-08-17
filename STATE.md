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
 1. [ ] Public SSR landing at `/` with entry animations; `/about` public
        [verify: dsx build; curl the served / shows content pre-hydration; screenshot]
 2. [ ] Sign up + sign in + sign out against the real Supabase project; session survives
        reload (HttpOnly refresh cookie -> /auth/refresh rehydrates the bearer)
        [verify: live probe with curl + browser walk]
 3. [ ] /notes + /notes/:id gated: no session -> redirected to /signin; API rows
        auth="required" answer 401 anonymously
        [verify: curl anonymous 401; browser walk signed in]
 4. [ ] Real backend: server/notes.dsx (<server> document, source of truth) — entity note
        (title, body) ownership=owner, CRUD routes; migration applied to the real project;
        RLS proven live (user B cannot read user A's note)
        [verify: two-user curl probe: create as A, list as B -> []]
 5. [ ] Animations declared in the documents (enter= on screens, transition= on rows)
        [verify: web screenshots; the same files are what native renders]
 6. [ ] Only `dsx` + documented seams: dsx build/dev/lint green; worker assembled on
        @despia/server createWorkersHandler; deploy config staged for wrangler
        [verify: npm run build && npm run lint from tarballs]
 7. [ ] Live on exampleapp.despia.com   [gated: operator's Cloudflare token + DNS record]
 8. [ ] README reads as the bootstrap: quickstart, architecture map, copy-this-repo story
        [verify: read]
 9. [ ] Profile screen (gated): display name edit + password change, self-serve against
        GoTrue with the user's OWN bearer (PUT /auth/v1/user via the auth shell)
        [verify: browser walk; name persists across reload]
10. [ ] Delete account (gated, confirm sheet): removes the auth user AND their rows;
        signs out; the account is gone
        [verify: live probe — sign up throwaway, create note, delete account, sign-in
        fails, rows gone. Needs SUPABASE_SERVICE_KEY env (admin API); route lives in the
        auth shell, key never reaches a page]
11. [ ] Settings screen (gated): dark-mode toggle (global.settings.dark, the system
        theme plane) + about/links; preference survives within the session
        [verify: browser walk + dark screenshot]
12. [ ] Adaptive layout: phone = stacked navigation; tablet/desktop width = two-pane
        notes (list + detail side by side); the app area hangs off a tab shell
        (Notes · Profile · Settings) like every starter template
        [verify: screenshots at 390px and 1024px widths]
13. [ ] Installable PWA: manifest + icons + offline shell from the dsx build
        [verify: Chromium installability audit / manifest fetch]
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

Progress: 0/8 verified (screens + server doc + auth shell written and pushed, nothing
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
