# Prompt Governance & Evaluation (local-first)

Local-first dashboard built with Vite + React + TypeScript. Data never leaves the browser; everything is persisted in `localStorage` under `promptGov:v1`.

## Commands

- `npm install`
- `npm run dev` – start the dev server on port 4173
- `npm run build` – typecheck + production build
- `npm run test` – Vitest suite
- `npm run typecheck` – strict TS check

## Routes

- `/` – dashboard and lint summary
- `/about` – project context and safety notes
- `/eval` – run the mock evaluator across prompts
- `/new` – create a prompt
- `/prompt/:id` – prompt detail + version history + evals
- `/edit/:id` – edit a prompt (records a new snapshot)
- `/import` – paste JSON to import (invalid JSON shows an inline error)
- `/export` – copy the canonical JSON snapshot

## Data model

- `schema_version`: `1.0`
- storage key: `promptGov:v1`
- export contract: `schema_version`, `exported_at`, `prompts`, `eval_reports`
- migrations: registry runs on load; invalid or legacy shapes are repaired to 1.0
- versioning: each save creates a snapshot with version bump + timestamp + change summary
- lint: simple rubric surfaces errors/warnings in library and detail views
- regression detection: pass → fail transitions are flagged in eval reports
