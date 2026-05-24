# Agent guide — ui-morph

React library (`@ui-morph/react`) that wraps a SaaS app's UI so end users can customize it (hide elements, edit text, styles, reorder) with persistence per `(userId, viewId)`.

## Repo map

```
ui-morph/
├── packages/react/     @ui-morph/react — library (publish target)
├── packages/api/       @ui-morph/api — Express + Postgres + layout agent (Gemini)
├── demo/               Insurance-themed dev app (consumes workspace package)
├── docs/PLAN.md        Original MVP plan — see "Plan vs code" below
├── pnpm-workspace.yaml
└── package.json        Root scripts
```

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install workspace deps |
| `pnpm db:up` | Start Postgres (Docker) |
| `pnpm db:migrate` | Run API migrations |
| `pnpm dev` | Watch-build `@ui-morph/react` |
| `pnpm dev:api` | Run API on `:3001` |
| `pnpm dev:demo` | Run demo at Vite dev server |
| `pnpm test` | API + react unit tests |
| `pnpm typecheck` | Typecheck all packages |

Set `GEMINI_API_KEY` in `packages/api/.env` for the layout agent.

Node ≥18, pnpm ≥9.

## Architecture (current)

**Entry:** `<Morph userId viewId? apiUrl? editable …>{children}</Morph>`.

**Path IDs:** DOM-based (`tree/domDecorator.ts`). Segments: `data-morph-id` → `id:…`, else type-scoped `tag:n`. Root prefix `morph.*`.

**Overrides:** `Record<path, ElementOverride>` — `hidden`, `text`, `style`, `childOrder` (segments for reorder, e.g. `motion.div:0`).

**Persistence (manual):** Optimistic local state; **Save** toolbar → `PUT /config/:userId/:viewId`.

**Layout agent (AI):** Edit panel **Chat** tab → client snapshot → `POST /agent/message` → Gemini proposes changes → **live preview on page** → user **Accept** (persists via Save/`PUT /config`) or **Discard** (reverts). Changed elements get a dashed highlight.

**Snapshot scope:** Only the Morph subtree (demo: `<Outlet />`, not sidebar).

**Requires `apiUrl`** on `<Morph>` for AI chat (e.g. `http://localhost:3001`).

## Agent tools (server)

| Tool | Maps to |
|------|---------|
| `set_element_override` | Merge into path (like `SET_OVERRIDE`) |
| `remove_element_override` | `REMOVE_OVERRIDE` |
| `reorder_children` | `REORDER_CHILDREN` (`childOrder` = **segments**, not full paths) |

Shared types: `LayoutSnapshot`, `LayoutNode` in `packages/react/src/types.ts` (mirrored in `packages/api/src/types.ts`).

## Plan vs code

| PLAN | Current |
|------|---------|
| React tree walker | DOM `decoratePaths` / `applyDomOverrides` |
| `POST /override` ai_prompt | Use `POST /agent/message` instead |
| `packages/demo` | `demo/` at repo root |

## Conventions

- React 17+ compatible hooks only in the library.
- Minimize diff scope; commits only when asked.

## Cursor rules

File-specific guidance in `.cursor/rules/`.
