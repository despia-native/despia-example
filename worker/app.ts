//
//  worker/app.ts — the Field Notes backend, platform-free: the compiled form of
//  server/notes.dsx (re-exported from server/generated/, `dsx build`'s server-document
//  compile step) and the auth shell. Two entries consume this whole file unchanged:
//  index.ts (Cloudflare Workers, the deployment) and local.ts (node + PGlite, the
//  development loop) — the same shape @despia/server's own bootloaders take.
//
//  The auth shell brokers Supabase GoTrue server-side: the page never sees the identity
//  provider or an API key. The refresh token rides an HttpOnly SameSite=Lax cookie
//  scoped to /auth; the access token goes to the page and returns as a bearer — the
//  ONLY carrier the data routes accept (identity.ts law).
//

const AUTH_COOKIE = "dsx_refresh";
const YEAR = 60 * 60 * 24 * 365;

//  The compiled form of server/notes.dsx comes from `dsx build`'s server-document compile
//  step (server/generated/): the document is the source of truth, the barrel is its compiled
//  form, and this file no longer hand-carries the rows (STATE.md F1, landed).
export { entities, handlers, migrationSql, routes } from "../server/generated/index.ts";

//  data_backend is DECLARED (B4: config, not raw env); DSX_DATA_BACKEND still wins.
export const serverConfig = {
  settings: { data_backend: "postgres" },
  env: { data_backend: "DSX_DATA_BACKEND" },
  required: [],
};

// ── the auth shell ──────────────────────────────────────────────────────────────────────

function cookie(value: string, maxAge: number): string {
  return `${AUTH_COOKIE}=${value}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function readCookie(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === AUTH_COOKIE) return rest.join("=");
  }
  return null;
}

function json(status: number, body: unknown, extra?: Record<string, string>): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const [k, v] of Object.entries(extra ?? {})) headers.append(k, v);
  return new Response(JSON.stringify(body), { status, headers });
}

type GoTrueSession = {
  access_token?: string; refresh_token?: string;
  user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> };
  error_description?: string; msg?: string; message?: string;
};

async function gotrue(
  env: Record<string, string>, method: string, path: string, body: unknown, bearer?: string,
): Promise<{ status: number; reply: GoTrueSession }> {
  const headers: Record<string, string> = { "content-type": "application/json", apikey: env["SUPABASE_ANON_KEY"] ?? "" };
  if (bearer !== undefined) headers["authorization"] = `Bearer ${bearer}`;
  const res = await fetch(`${env["SUPABASE_URL"]}${path}`, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
  });
  const reply = res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as GoTrueSession);
  return { status: res.status, reply };
}

function sessionReply(reply: GoTrueSession): Response {
  return json(200, {
    token: reply.access_token,
    email: reply.user?.email ?? null,
    name: (reply.user?.user_metadata?.["name"] as string | undefined) ?? null,
  }, reply.refresh_token ? { "set-cookie": cookie(reply.refresh_token, YEAR) } : undefined);
}

function authProblem(status: number, reply: GoTrueSession): Response {
  const message = reply.error_description ?? reply.msg ?? reply.message ?? "authentication failed";
  return json(status >= 500 ? 502 : 401, { message });
}

function bearerOf(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}

/** login · signup · refresh · logout · profile (self-serve) · delete-account (admin). */
export async function authRoutes(request: Request, env: Record<string, string>): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/auth/")) return null;

  if (request.method === "POST" && (url.pathname === "/auth/login" || url.pathname === "/auth/signup")) {
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string; name?: string };
    if (!body.email || !body.password) return json(400, { message: "email and password are required" });
    const { status, reply } = url.pathname === "/auth/login"
      ? await gotrue(env, "POST", "/auth/v1/token?grant_type=password", { email: body.email, password: body.password })
      : await gotrue(env, "POST", "/auth/v1/signup", { email: body.email, password: body.password, data: { name: body.name ?? "" } });
    if (status < 300 && reply.access_token) return sessionReply(reply);
    // Sign-up with confirmations ON answers without a session — say so instead of half-failing.
    if (status < 300) return json(401, { message: "account created — confirm your email, then sign in" });
    return authProblem(status, reply);
  }

  if (request.method === "POST" && url.pathname === "/auth/refresh") {
    const refresh = readCookie(request);
    if (refresh === null || refresh === "") return json(401, { message: "no session" });
    const { status, reply } = await gotrue(env, "POST", "/auth/v1/token?grant_type=refresh_token", { refresh_token: refresh });
    if (status < 300 && reply.access_token) return sessionReply(reply);
    return authProblem(status, reply);
  }

  if (request.method === "POST" && url.pathname === "/auth/logout") {
    return json(200, { ok: true }, { "set-cookie": cookie("", 0) });
  }

  //  Self-serve profile: GoTrue PUT /auth/v1/user with the USER'S OWN bearer — display
  //  name in user_metadata, optionally a new password. No admin key involved.
  if (request.method === "POST" && url.pathname === "/auth/profile") {
    const bearer = bearerOf(request);
    if (bearer === null) return json(401, { message: "sign in first" });
    const body = (await request.json().catch(() => ({}))) as { name?: string; password?: string };
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") patch["data"] = { name: body.name };
    if (typeof body.password === "string" && body.password !== "") patch["password"] = body.password;
    if (Object.keys(patch).length === 0) return json(400, { message: "nothing to update" });
    //  GoTrue answers PUT /auth/v1/user with the user object at the TOP level.
    const { status, reply } = await gotrue(env, "PUT", "/auth/v1/user", patch, bearer);
    const me = reply as { email?: string; user_metadata?: Record<string, unknown> };
    if (status < 300) {
      return json(200, {
        email: me.email ?? null,
        name: (me.user_metadata?.["name"] as string | undefined) ?? null,
      });
    }
    return authProblem(status, reply);
  }

  //  Delete account: the user asks with their OWN bearer; the deletion runs with the
  //  service key against the admin API. The key lives only in this shell's env.
  if (request.method === "POST" && url.pathname === "/auth/delete-account") {
    const bearer = bearerOf(request);
    if (bearer === null) return json(401, { message: "sign in first" });
    const who = await gotrue(env, "GET", "/auth/v1/user", null, bearer);
    const id = (who.reply as { id?: string }).id ?? who.reply.user?.id;
    if (who.status >= 300 || id === undefined) return authProblem(who.status, who.reply);
    const service = env["SUPABASE_SERVICE_KEY"];
    if (service === undefined || service === "") return json(503, { message: "account deletion is not configured" });
    const res = await fetch(`${env["SUPABASE_URL"]}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: { apikey: service, authorization: `Bearer ${service}` },
    });
    if (res.status < 300) return json(200, { ok: true }, { "set-cookie": cookie("", 0) });
    return json(502, { message: "deletion failed" });
  }

  return null;
}
