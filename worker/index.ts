//
//  worker/index.ts — the Field Notes worker: the whole backend of the example, on the
//  documented stack. Three parts, one worker:
//    · the SITE — Workers Static Assets serve the dsx build; dynamic routes SSR through
//      the platform-free page handler (createWorkersHandler chains them),
//    · the DATA routes — the compiled form of server/notes.dsx: declared CRUD rows,
//      auth="required", RLS enforced by the database (do not add handler code here;
//      when `dsx build` grows the server-document compile step this table is emitted),
//    · the AUTH SHELL — login/signup/refresh/logout against Supabase GoTrue, server-side.
//      The refresh token rides an HttpOnly SameSite=Lax cookie; the access token is
//      returned to the page and sent as a bearer. The bearer stays the only carrier on
//      data routes (identity.ts law) — the cookie feeds ONLY this shell.
//
//  Config (env): SUPABASE_URL, SUPABASE_ANON_KEY (publishable), DSX_JWT_MODE=jwks,
//  DSX_JWT_JWKS_URL, and the database url (locally DSX_DATABASE_URL; deployed, the
//  Hyperdrive binding the bootloader maps).
//

import { createWorkersHandler } from "@despia/server/bootloader-workers";
import type { HostRoute } from "@despia/server";

const AUTH_COOKIE = "dsx_refresh";
const YEAR = 60 * 60 * 24 * 365;

//  The compiled form of server/notes.dsx — one row per <route>. Declared CRUD: the host's
//  generated handlers scope every statement to the verified caller (repo.ts), so there is
//  no author code to get wrong.
const routes: HostRoute[] = [
  { method: "GET",    path: "/api/notes",     action: "data.note.list",   auth: "required", reach: ["web"] },
  { method: "POST",   path: "/api/notes",     action: "data.note.create", auth: "required", reach: ["web"] },
  { method: "GET",    path: "/api/notes/:id", action: "data.note.get",    auth: "required", reach: ["web"] },
  { method: "PATCH",  path: "/api/notes/:id", action: "data.note.update", auth: "required", reach: ["web"] },
  { method: "DELETE", path: "/api/notes/:id", action: "data.note.delete", auth: "required", reach: ["web"] },
];

const entities = {
  note: { fields: ["title", "body"], ownership: "owner" as const },
};

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

type GoTrueSession = {
  access_token?: string; refresh_token?: string;
  user?: { email?: string }; error_description?: string; msg?: string; message?: string;
};

async function gotrue(env: Record<string, string>, path: string, body: unknown): Promise<{ status: number; session: GoTrueSession }> {
  const res = await fetch(`${env["SUPABASE_URL"]}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: env["SUPABASE_ANON_KEY"] ?? "" },
    body: JSON.stringify(body),
  });
  return { status: res.status, session: (await res.json()) as GoTrueSession };
}

function sessionReply(session: GoTrueSession): Response {
  const headers = new Headers({ "content-type": "application/json" });
  if (session.refresh_token) headers.append("set-cookie", cookie(session.refresh_token, YEAR));
  return new Response(
    JSON.stringify({ token: session.access_token, email: session.user?.email ?? null }),
    { status: 200, headers },
  );
}

function authProblem(status: number, session: GoTrueSession): Response {
  const message = session.error_description ?? session.msg ?? session.message ?? "authentication failed";
  return new Response(JSON.stringify({ message }), {
    status: status >= 500 ? 502 : 401,
    headers: { "content-type": "application/json" },
  });
}

/** The auth shell — the one hand-written surface, and it only brokers GoTrue. */
async function authRoutes(request: Request, env: Record<string, string>): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/auth/") || request.method !== "POST") return null;

  if (url.pathname === "/auth/login" || url.pathname === "/auth/signup") {
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return new Response(JSON.stringify({ message: "email and password are required" }), { status: 400, headers: { "content-type": "application/json" } });
    }
    const grant = url.pathname === "/auth/login" ? "/auth/v1/token?grant_type=password" : "/auth/v1/signup";
    const { status, session } = await gotrue(env, grant, { email: body.email, password: body.password });
    // Sign-up with confirmations off answers with a session; with them on it answers
    // without one — surface that as a message instead of a broken half-state.
    if (status < 300 && session.access_token) return sessionReply(session);
    if (status < 300) return new Response(JSON.stringify({ message: "account created — confirm your email, then sign in" }), { status: 401, headers: { "content-type": "application/json" } });
    return authProblem(status, session);
  }

  if (url.pathname === "/auth/refresh") {
    const refresh = readCookie(request);
    if (!refresh) return new Response(JSON.stringify({ message: "no session" }), { status: 401, headers: { "content-type": "application/json" } });
    const { status, session } = await gotrue(env, "/auth/v1/token?grant_type=refresh_token", { refresh_token: refresh });
    if (status < 300 && session.access_token) return sessionReply(session);
    return authProblem(status, session);
  }

  if (url.pathname === "/auth/logout") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json", "set-cookie": cookie("", 0) },
    });
  }

  return null;
}

const handler = createWorkersHandler({ routes, entities });

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: unknown): Promise<Response> {
    const auth = await authRoutes(request, env as Record<string, string>);
    if (auth !== null) return auth;
    return handler.fetch(request, env, ctx);
  },
};
