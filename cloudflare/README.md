# Cloudflare Deployment

This project cannot run the local Express + `node:sqlite` backend directly on Cloudflare. The Cloudflare deployment uses:

- Cloudflare Workers for `/api/*`
- Cloudflare Workers Assets for `client/dist`
- Cloudflare D1 instead of local SQLite
- Cloudflare secret `STEAM_API_KEY`

## Steps

```bash
npm install
npm run build
npx wrangler login
npx wrangler d1 create steam-playtime-archive-db
```

Copy the returned `database_id` into `wrangler.toml`.

```bash
npx wrangler secret put STEAM_API_KEY
npx wrangler d1 execute steam-playtime-archive-db --remote --file=cloudflare/schema.sql
npx wrangler deploy
```

The final deploy command prints the public Cloudflare Workers URL.
