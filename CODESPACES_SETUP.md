# Codespaces Setup

This repo is configured for GitHub Codespaces so development can run from a cloud workspace instead of a local Mac.

## Required Secrets

Add these as Codespaces secrets in GitHub before starting the codespace:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use the same values from the local `.env.local` file. Do not commit `.env.local`.

## Create The Codespace

1. Open the GitHub repo.
2. Click `Code`.
3. Click the `Codespaces` tab.
4. Click `Create codespace on main`.
5. Wait for setup to finish. The devcontainer runs `npm ci`.

## Run The App

```bash
npm run dev -- --host 0.0.0.0
```

Codespaces should offer to open or forward port `5173`.

## Verify Before Pushing

```bash
npm run build
npm run lint
```

The current project may show an existing lint warning in `src/pages/AnnouncementsFeed.jsx`; new changes should not add new errors.
