# Falcon AI — web app

React + TypeScript single-page app built with Vite. Follows
`docs/private/Templates/Vite-Build-Template.md` as adapted by the Falcon AI
addendum in `SOP.md`.

## Layout

```
code/frontend/
├── src/
│   ├── main.tsx            # root ErrorBoundary, router, <Toaster/>, <AppTooltip/>
│   ├── App.tsx             # route table only (paths from ROUTES.pages)
│   ├── index.css           # Tailwind + placeholder tokens (DESIGN.md replaces them)
│   ├── pages/public/       # StartPage, NotFoundPage
│   ├── layouts/            # PublicLayout
│   ├── components/ui/      # Button, AppTooltip
│   ├── components/feedback/# ErrorBoundary, ErrorFallback, toast.ts (notify), LoadingState
│   ├── lib/routes.ts       # every API path and page path
│   ├── lib/api/            # apiClient (singleton), errorMap
│   ├── lib/config/env.ts   # zod-validated import.meta.env
│   ├── hooks/              # use-*.ts
│   └── types/              # API envelope + DTO types
├── public/                 # favicon
├── nginx.conf              # production serving (port 80)
├── Dockerfile.dev          # Vite dev server + HMR
└── Dockerfile.prod         # build → nginx:alpine
```

Compose files and `.env*` files live in `code/` root, not here.

## Rules

- **All fetches go through `apiClient`** (`src/lib/api/apiClient.ts`). No `fetch` anywhere else.
- **All paths come from `ROUTES`** (`src/lib/routes.ts`): API URLs, router paths, `navigate()` targets.
- Users only ever see mapped, friendly error messages (`errorMap.ts`, `notify`). Raw errors go to the console in dev only.
- Toasts only through `notify` (`components/feedback/toast.ts`); tooltips only through the global `AppTooltip`.
- Every button has an icon; async buttons show a spinner and are disabled while pending.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b` (no output files) |
| `npm run build` | type check + production build (only when Matt says so) |
| `npm run preview` | serve the production build locally |

## Environment variables

Set in the env files in `code/` root. `VITE_*` values are public: they are baked
into the JS bundle, so never put a secret in one.

| Variable | Used by | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | app (`env.ts`) | Absolute backend URL including `/api`, e.g. `http://localhost:<backend port>/api` |
| `VITE_APP_NAME` | app (`env.ts`) | App name |
| `VITE_ENVIRONMENT` | app (`env.ts`) | `development` or `production` |
| `VITE_DEV_PORT` | `vite.config.ts`, `Dockerfile.dev` | Port the dev server listens on in the container |
| `FRONTEND_PORT` | `vite.config.ts` | Host-side port the browser uses (HMR) |

Production builds take `VITE_API_BASE_URL`, `VITE_APP_NAME` and
`VITE_ENVIRONMENT` as Docker build args.
