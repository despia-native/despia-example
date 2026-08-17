# despia-example state — the PRODUCTION example (the owner's gate, 2026-08-17)

Goal: this repo is THE example: a real deployed app at https://exampleapp.despia.com with
auth, backend, SSR, landing page, gated pages, and animations that render on iOS, Android
and web from one set of documents. Built and deployed only through the open toolchain
(`dsx`). The owner's words: if this is not done, nothing else continues. This gates the
launch checklist in the monorepo's WHATS-LEFT.md.

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

Progress: 0/8. Next: item 4's migration + items 1-3 components.
