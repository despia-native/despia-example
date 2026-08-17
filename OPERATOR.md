# Operator steps: put Field Notes on exampleapp.despia.com

Everything else is done and live-verified locally (STATE.md has the evidence). These four
steps need your Cloudflare and Supabase identity; about 15 minutes total.

### 1. Create a Cloudflare API token

Link: https://dash.cloudflare.com/profile/api-tokens

1. Click **Create Token** then **Create Custom Token**
2. Name: `despia-example-deploy`
3. Permissions: **Account / Workers Scripts / Edit**, **Account / Cloudflare Workers / Edit** (Hyperdrive is under Workers), **Zone / DNS / Edit** for zone `despia.com`
4. Click **Continue to summary** then **Create Token** and COPY it

Verify: the token string is on screen.
Return: run the commands in steps 2 and 4 with it.

### 2. Create the Hyperdrive config (connects the worker to Supabase Postgres)

The connection string user is the dedicated low-privilege role `dsx_example` (already
created on the project with only `anon`/`authenticated` membership); its password is in
this repo's local `.env` on the build machine (never committed). Reset it any time in the
SQL editor with `alter role dsx_example with password '...'`.

```bash
CLOUDFLARE_API_TOKEN=<TOKEN_FROM_STEP_1> npx wrangler hyperdrive create despia-example \
  --connection-string="postgresql://dsx_example.hforkizbesezccnbeqjh:<DSX_EXAMPLE_DB_PASSWORD>@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

Verify: the output prints an `id`.
Return: paste that id into `wrangler.jsonc` replacing `OPERATOR_FILLS_HYPERDRIVE_ID`.

### 3. Get the Supabase service key (powers Delete account)

Link: https://supabase.com/dashboard/project/hforkizbesezccnbeqjh/settings/api-keys

1. Copy the **service_role** key (or create a secret key)

```bash
CLOUDFLARE_API_TOKEN=<TOKEN_FROM_STEP_1> npx wrangler secret put SUPABASE_SERVICE_KEY
```

2. Paste the key when prompted

Verify: `wrangler secret list` shows SUPABASE_SERVICE_KEY.

### 4. Deploy

```bash
npm install && npm run build
CLOUDFLARE_API_TOKEN=<TOKEN_FROM_STEP_1> npx wrangler deploy
```

Verify: https://exampleapp.despia.com loads the landing page; sign up, write a note.
(The custom domain is created automatically from the `routes` entry in wrangler.jsonc;
DNS on despia.com must be on Cloudflare for that to bind.)

### 5. One auth decision (sign-up emails)

Link: https://supabase.com/dashboard/project/hforkizbesezccnbeqjh/auth/providers

Email confirmations are ON with Supabase's rate-limited default SMTP. Either turn
**Confirm email** OFF (sign-up works instantly, the starter behavior), or configure real
SMTP under Auth settings. Until one of these, new sign-ups see "confirm your email" and
the mail may not arrive.

Verify: sign up with a fresh address on the live site and land in the app.
