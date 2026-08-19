//
//  worker/local.ts — the development twin of index.ts: the SAME app (routes, handlers,
//  entities, auth shell) served from node, with PGlite as the database. PGlite IS
//  Postgres (the engine compiled to WASM), so the emitted table shape, force RLS and
//  the owner policy run for real — what @despia/server's own RLS suite executes.
//  Identity is REAL: ES256 JWTs from the live Supabase project, verified against its
//  JWKS by the same resolver production uses.
//
//    node --env-file=.env worker/local.ts   (port 8788, or PORT)
//
//  Deployment never runs this file; wrangler runs index.ts against managed Postgres
//  through Hyperdrive. Keep the two entries boring and identical in shape.
//

import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { createSiteHandler } from "@despia/server";
import { createHost, installEntities } from "@despia/server/host";
import { createIdentityResolver } from "@despia/server/identity";
import { installPostgresClient, type SqlClient } from "@despia/server/postgres";

import { authRoutes, entities, handlers, migrationSql, routes } from "./app.ts";

const PORT = Number(process.env["PORT"] ?? 8788);

async function database(): Promise<void> {
  const db = await PGlite.create();
  //  The GENERATED migration (server/generated/, from server/notes.dsx): PGlite IS
  //  Postgres, so the emitted table shape, force RLS and the owner policy run for real.
  await db.exec(migrationSql);
  const client: SqlClient = {
    query: async (text, params) => {
      const r = await db.query(text, params as never[]);
      return { rows: r.rows as unknown[] };
    },
  };
  installPostgresClient(client);
}

function env(key: string): string | undefined {
  const value = process.env[key];
  return value === undefined || value === "" ? undefined : value;
}

async function webRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) for (const one of v) headers.append(k, one);
  }
  return new Request(`http://127.0.0.1:${PORT}${req.url ?? "/"}`, {
    method: req.method ?? "GET",
    headers,
    body: body.length === 0 ? undefined : body,
  });
}

async function writeResponse(web: Response, res: ServerResponse): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  const cookies = web.headers.getSetCookie();
  web.headers.forEach((v, k) => { if (k !== "set-cookie") headers[k] = v; });
  if (cookies.length > 0) headers["set-cookie"] = cookies;
  res.writeHead(web.status, headers);
  res.end(Buffer.from(await web.arrayBuffer()));
}

async function main(): Promise<void> {
  await database();
  installEntities(entities);
  const host = createHost({ routes, handlers });
  const resolveIdentity = createIdentityResolver(env);
  const dist = join(import.meta.dirname, "..", "dist");
  const registry = JSON.parse(readFileSync(join(dist, "registry.json"), "utf8"));
  const site = createSiteHandler(dist, registry);

  const server = createServer((req, res) => {
    void (async () => {
      const request = await webRequest(req);
      const auth = await authRoutes(request, process.env as Record<string, string>);
      if (auth !== null) return writeResponse(auth, res);
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        const identity = await resolveIdentity(request);
        return writeResponse(await host.handle(request, { identity, env }), res);
      }
      const page = await site(request);
      if (page !== null) return writeResponse(page, res);
      return writeResponse(new Response("not found", { status: 404 }), res);
    })().catch((e: unknown) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ reason: "transport_failed", message: e instanceof Error ? e.message : String(e) }));
    });
  });

  server.listen(PORT, () => {
    console.log(`[field-notes local] http://127.0.0.1:${PORT} (PGlite + real Supabase auth)`);
  });
}

void main();
