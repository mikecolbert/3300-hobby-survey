# Deploying a Replit Vite/pnpm Monorepo to Azure Static Web Apps

This document captures the steps and gotchas encountered when deploying this project to Azure Static Web Apps (SWA). Use it as a reference when setting up a similar Replit-based project.

---

## Overview

This project is a pnpm monorepo originally built on Replit. The frontend (`artifacts/hobby-survey`) is a React + Vite SPA that connects to Supabase. Deploying it to Azure SWA required changes in three areas: the Vite config, the GitHub Actions workflow, and Azure SWA routing.

---

## Step 1 — Fix the Vite Config for CI

Replit injects `PORT` and `BASE_PATH` as environment variables at runtime. These are not available in CI or Azure, so the Vite config must not throw if they are absent.

**File:** `artifacts/mockup-sandbox/vite.config.ts` (and any other artifact with the same pattern)

**Before:**
```ts
const rawPort = process.env.PORT;
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);

const basePath = process.env.BASE_PATH;
if (!basePath) {
  throw new Error("BASE_PATH environment variable is required but was not provided.");
}
```

**After:**
```ts
const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";
```

`PORT` defaults to `3000` (unused during a static build) and `BASE_PATH` defaults to `/` (correct for a root-hosted SWA).

---

## Step 2 — Add staticwebapp.config.json

Azure SWA requires a `staticwebapp.config.json` in the build output to handle client-side routing (so that deep links and refreshes don't return a 404).

Place this file in the `public/` folder of each Vite app so it gets copied into the build output automatically.

**File:** `artifacts/<app-name>/public/staticwebapp.config.json`

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.{js,css,ico,png,svg,json}"]
  }
}
```

---

## Step 3 — Connect the Repo to Azure Static Web Apps

1. In the Azure Portal, create a new **Static Web App** resource.
2. When prompted, connect it to your GitHub repository. Azure will automatically commit a workflow file to `.github/workflows/` named something like `azure-static-web-apps-<slug>.yml`.
3. Note the name of the auto-generated workflow file — this is the one that actually runs, not any workflow you create manually.

---

## Step 4 — Update the Auto-Generated Workflow

Azure's generated workflow does not know about pnpm workspaces or Vite build-time environment variables. It needs two additions: injecting `VITE_*` secrets into the build step, and ensuring pnpm is set up before install.

**File:** `.github/workflows/azure-static-web-apps-<slug>.yml`

The key changes to make:

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9   # match your lockfile version (check first line of pnpm-lock.yaml)

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "22"
    cache: "pnpm"

- name: Install dependencies
  run: pnpm install

- name: Build
  run: pnpm run build
  env:
    NODE_ENV: production
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

- name: Build And Deploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_<SLUG> }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    action: "upload"
    app_location: "artifacts/hobby-survey/dist/public"
    skip_app_build: true
    api_location: ""
```

The `skip_app_build: true` flag tells Azure to skip its own build system (Oryx) and use the output you already built. `app_location` then points directly to the pre-built output directory.

---

## Step 5 — Add GitHub Repository Secrets

Vite bakes `VITE_*` environment variables into the JavaScript bundle **at build time**. This means they must be available when `vite build` runs in GitHub Actions — Azure SWA's own environment variable settings have no effect on the static bundle.

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

> **Note:** Do not rely on the environment variable settings inside the Azure SWA portal for `VITE_*` variables. Those only apply to server-side code (Azure Functions). They have no effect on a statically built Vite bundle.

---

## Step 6 — Trigger a Deployment

After pushing the workflow changes, trigger a fresh deploy by pushing any commit to `main`:

```bash
git commit --allow-empty -m "Trigger deployment" && git push
```

---

## Debugging Tips

**To verify secrets are being picked up**, add a temporary step before the build:

```yaml
- name: Check secrets
  run: |
    echo "VITE_SUPABASE_URL is set: ${{ secrets.VITE_SUPABASE_URL != '' }}"
    echo "VITE_SUPABASE_ANON_KEY is set: ${{ secrets.VITE_SUPABASE_ANON_KEY != '' }}"
```

This prints `true` or `false` without exposing the actual values. Remove it once everything is confirmed working.

**If you see a blank page**, open the browser console. A `Missing Supabase environment variables` error means the build ran without the secrets — check that the secret names match exactly (case-sensitive, no extra spaces) and that the workflow was re-run after the secrets were saved.

**If you get a 404 on deep links**, the `staticwebapp.config.json` is missing or not being copied into the build output. Confirm it is in the `public/` folder of the Vite app.

---

## pnpm Platform Overrides

The `pnpm-workspace.yaml` in this project excludes many platform-specific native binaries (darwin, win32, musl variants) to reduce install size on Replit's linux-x64 environment. GitHub Actions `ubuntu-latest` runners also use linux-x64 (glibc), so these overrides are compatible. Do not remove the linux-x64 (non-musl) entries or CI installs will fail.
