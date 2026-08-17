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
        wrangler deploy --dry-run bundles clean (263 KiB gz, Hyperdrive+Assets+vars
        bindings recognized); the BUILT bundle booted under real workerd (miniflare):
        site 200, SSR /signin 200, manifest 200, anonymous API 401, unknown 404
 7. [ ] Live on exampleapp.despia.com   [gated] -> OPERATOR.md steps 1-4
 8. [x] README reads as the bootstrap    verified: rewritten (piece map, run, export, copy story)
 9. [x] Profile screen: name + password self-serve via /auth/profile
        verified: live probe (name persisted in GoTrue) + shots/04-profile-phone.png
10. [~] Delete account: confirm sheet + /auth/delete-account shipped; the unconfigured
        branch answers a clean 503 (live-verified). The configured path runs the first
        deploy with SUPABASE_SERVICE_KEY (OPERATOR.md step 3) — re-probe then
11. [x] Settings screen: dark toggle + about rows. The toggle is WIRED: every page
        root pins theme="{{ global.settings.dark ? 'dark' : '' }}" (the StackReference
        subtree pin — stamps data-dsx-theme, off = follow system), so flipping it
        re-themes the whole app with no OS help
        verified: browser walk in a LIGHT context — toggle click stamps
        .dsx-tabs[data-dsx-theme="dark"] and the shell luma goes dark
        (shots/05d-settings-toggled.png); OS-dark shots 01d/02d/03d ride the token twins
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

Progress: 9/13 verified, 3 part-verified with the open half named, 1 operator-gated.

Next, in order:
1. Operator runs OPERATOR.md (Cloudflare token -> Hyperdrive -> service key -> deploy ->
   the email-confirmation decision). Then: live re-probe on exampleapp.despia.com
   including the configured delete-account path (item 10) and a fresh-address signup
   (item 2).
2. Item 13's open half: emit the offline service worker from dsx build (pairs with the
   bundled-floor/offline practice docs).
3. Monorepo follow-ups F1 (server-document compile step in dsx) and F2 (native session
   persistence primitive) — tracked in the monorepo STATE.
