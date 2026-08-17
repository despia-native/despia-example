//
//  worker/index.ts — the Cloudflare Workers entry: the shared app (worker/app.ts) on
//  @despia/server's workers bootloader. Static assets + SSR ride the assets binding;
//  the data routes resolve postgres through the Hyperdrive binding the bootloader maps
//  to DSX_DATABASE_URL. Local development runs worker/local.ts instead (node + PGlite).
//

import { createWorkersHandler } from "@despia/server/bootloader-workers";
import { installPostgresPool } from "@despia/server/postgres";

import { authRoutes, entities, handlers, routes, serverConfig } from "./app.ts";

const dataProviders = [{
  backend: "postgres",
  async install(env: (key: string) => string | undefined): Promise<{ installed: boolean; backend: string }> {
    const url = env("DSX_DATABASE_URL");
    if (url === undefined || url === "") return { installed: false, backend: "postgres" };
    const { Pool } = await import("pg");
    installPostgresPool(new Pool({ connectionString: url, max: 5 }));
    return { installed: true, backend: "postgres" };
  },
}];

const handler = createWorkersHandler(
  { routes, handlers },
  serverConfig,
  { entities, backendSetting: "data_backend", dataProviders },
);

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: unknown): Promise<Response> {
    const auth = await authRoutes(request, env as Record<string, string>);
    if (auth !== null) return auth;
    return handler.fetch(request, env, ctx);
  },
};
