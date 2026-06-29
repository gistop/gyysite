# Deployment

This repository supports two deployment modes for the site-builder system itself.

## Linux Docker Compose

The existing deployment remains unchanged. It runs the frontend in nginx and the API in the Express container.

```sh
cp .env.example .env
npm run compose:up
```

This mode keeps the local `/sites/*` publishing target and the Docker volume used by `PUBLISH_ROOT`.

## Cloudflare Pages + Independent Worker

Use this mode when the site-builder system itself should run on Cloudflare.

- Frontend: Cloudflare Pages, built from `dist`.
- Backend: independent Cloudflare Worker from `workers/api.js`.
- The generated-site publishing flow is not redesigned here; the Worker keeps the Cloudflare/GitHub publishing path and disables local disk/OSS-only server targets.

Deploy the API Worker:

```sh
npm run cf:worker:deploy
```

Deploy the Pages frontend:

```sh
npm run cf:pages:deploy
```

Configure Cloudflare Pages with:

- Build command: `npm run build`
- Build output directory: `dist`
- Optional direct API route environment variable: `VITE_API_BASE_URL=https://<your-worker-domain>`
- Pages Function binding route: service binding `API_WORKER` pointing to Worker `gyysite19-api`

Configure the Worker secrets and variables for the features you use:

- `DEEPSEEK_API_KEY`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- R2 variables if asset upload is enabled

The Docker deployment can continue to use same-origin `/api`. The Cloudflare Pages deployment can either point `VITE_API_BASE_URL` at the independent Worker for direct API calls, or use the in-app `Pages Function binding` AI route to call `/api/ai/*` through the `API_WORKER` service binding.
