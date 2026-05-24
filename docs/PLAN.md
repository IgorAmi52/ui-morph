# ui-morph — Implementation Plan

## Context

Build a React wrapper component library (`@ui-morph/react`) that SaaS businesses install via npm. They wrap their UI with `<Morph>`, and their end-users can visually customize the interface — hide elements, edit text, change colors/sizes. Customizations persist to a backend database and apply automatically on page load.

This is an **MVP** — single SaaS instance, per-user configs. No multi-tenant API key infrastructure yet.

**AI editing** (per-element natural language prompts) is designed into the architecture but the AI agent backend is a separate concern — we build the frontend affordance (prompt input per element) and the API contract, not the AI processing itself.

---

## Decisions Made

| Decision | Choice |
|---|---|
| Element discovery | `React.Children` + `cloneElement` tree walking (no Fiber internals) |
| Scope | Phase 1: hide/show, text edit, style overrides, drag/move sibling reordering, persistence. |
| Backend | Simple Express REST API with PostgreSQL |
| Build | Vite library mode + TypeScript, pnpm monorepo |
| Change flow | All changes (manual + AI) go through backend for validation before persisting |
| Auth | MVP: per-user scoping via `userId` prop. No API key infrastructure yet. |
| Drag/move | Native pointer-event drag manager over decorated DOM nodes; no DnD dependency. |

---

## Package Structure

```
ui-morph/
├── pnpm-workspace.yaml
├── package.json                    # root scripts, shared devDeps
├── tsconfig.base.json
├── .gitignore
│
├── packages/
│   ├── react/                      # @ui-morph/react (the npm library)
│   │   ├── package.json            # react as peerDep (>=17)
│   │   ├── vite.config.ts          # lib mode → ESM + CJS
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # public barrel: Morph, types
│   │       ├── Morph.tsx           # main wrapper component
│   │       ├── types.ts
│   │       ├── tree/
│   │       │   ├── walkTree.ts     # recursive tree walker
│   │       │   ├── pathUtils.ts    # path ID generation + stability
│   │       │   └── applyOverrides.ts
│   │       ├── config/
│   │       │   ├── ConfigContext.tsx
│   │       │   ├── configReducer.ts
│   │       │   └── apiClient.ts
│   │       └── editor/
│   │           ├── EditModeProvider.tsx
│   │           ├── DndSortManager.tsx
│   │           ├── DragHandleLayer.tsx
│   │           ├── DropIndicator.tsx
│   │           ├── SelectionOverlay.tsx
│   │           ├── PropertyPanel.tsx
│   │           └── controls/
│   │               ├── TextEditor.tsx
│   │               ├── ColorPicker.tsx
│   │               ├── SizeControl.tsx
│   │               ├── VisibilityToggle.tsx
│   │               └── AiPromptInput.tsx
│   │
│   ├── api/                        # @ui-morph/api (backend)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── app.ts             # Express app factory
│   │       ├── routes/
│   │       │   ├── config.ts      # GET /config/:userId/:viewId
│   │       │   └── override.ts    # POST /override (validate + persist)
│   │       ├── services/
│   │       │   ├── configService.ts    # business logic + validation
│   │       │   └── validationService.ts
│   │       ├── db/
│   │       │   ├── client.ts      # pg pool wrapper
│   │       │   └── migrations/001_initial.sql
│   │       └── middleware/
│   │           └── errorHandler.ts
│   │
│   └── demo/                       # dev playground
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           └── SampleDashboard.tsx
```

---

## Core Architecture

### 1. `<Morph>` Component — The Single Public Entry Point

```tsx
<Morph userId={currentUser.id} viewId="dashboard" apiUrl="http://localhost:3001">
  <Header />
  <Sidebar />
  <MainContent />
</Morph>
```

**Props**:
- `userId` — identifies the end user (from SaaS app's auth)
- `viewId` — identifies which page/view this wraps (e.g., `"dashboard"`, `"settings"`)
- `apiUrl` — backend URL
- `mode` — `'view'` (default) or `'edit'`
- `onSave`, `onError` — callbacks
- `fallback` — shown while loading config
- `children` — the wrapped UI

Config is scoped to `(userId, viewId)` — each user has their own customizations per view.

**Behavior on mount**:
1. Fetch config from `GET {apiUrl}/config/{userId}/{viewId}`
2. Walk children tree via `React.Children` + `cloneElement`, applying overrides
3. Render modified tree

**Loading strategy**: Render children unmodified while config loads (no layout shift), then apply overrides once fetched.

### 2. Tree Walker (`walkTree.ts`) — The Core Algorithm

Recursively traverses the React element tree. For each element:
1. Compute a stable path ID
2. Look up overrides in config
3. Apply overrides (hide, style merge, text replace)
4. In edit mode: wrap element with `<MorphEditable>` for selection/interaction
5. Recurse into children

### 3. Path Stability (`pathUtils.ts`) — The Hardest Problem

Paths must survive across host app deploys. Strategy (priority order):

1. **`data-morph-id` prop** — Explicit stable ID set by SaaS developer. Escape hatch for dynamic UIs.
2. **React `key` prop** — If the element has an explicit key, use `k:{key}`.
3. **Type-scoped index** — Count this element's position among siblings of the _same type_ (not global index). Adding a `<span>` before a `<div>` doesn't shift the div's path.

Example paths: `morph.div:0.h1:0`, `morph.k:sidebar.ul:0.li:2`, `morph.header.nav:0`

### 4. Config Format

```json
{
  "morph.div:0.h1:0": { "style": { "color": "red", "fontSize": "18px" } },
  "morph.div:1": { "hidden": true },
  "morph.div:0.p:0": { "text": "Updated welcome message" },
  "morph.div:0": { "childOrder": ["section:1", "section:0", "section:2"] }
}
```

Type: `Record<string, ElementOverride>` where `ElementOverride = { hidden?, text?, style?, childOrder? }`

### 5. Change Flow — All Changes Through Backend

```
User edits element → frontend shows optimistic preview →
  POST /override { userId, viewId, path, changes } →
    backend validates (sanitize CSS, prevent XSS, apply business rules) →
      persist to DB → return confirmed config →
        frontend applies confirmed state
```

Both manual edits and AI prompts follow the same flow:
- **Manual**: User changes color → `POST /override` with `{ type: "manual", path, changes: { style: { color: "red" } } }`
- **AI**: User types prompt → `POST /override` with `{ type: "ai_prompt", path, prompt: "make this bigger and red" }` → backend processes via AI agent → returns validated config changes

The backend is the single source of truth. Frontend shows optimistic previews but reverts if validation fails.

### 6. Edit Mode

**Two-layer interaction suppression**:
- Capturing-phase event handlers (`onClickCapture`, etc.) on the edit container — `stopPropagation` + `preventDefault` for all non-editor clicks
- Editor UI elements marked with `data-morph-editor` are excluded from suppression

**Element selection flow**:
Click element → **PropertyPanel** appears with two tabs:
1. **Manual controls**: visibility toggle, text editor, color picker, size control
2. **AI prompt**: text input where user describes what they want ("make this text larger and blue")

**Drag/move flow**:
Pointer-drag a decorated element, or its generated grip handle → **DndSortManager** starts a drag after a small movement threshold → **DropIndicator** shows before/after insertion → releasing the pointer dispatches `REORDER_CHILDREN` with the parent path and new `childOrder`.

Drag is limited to reordering siblings under the same parent. The drop calculation supports vertical stacks and horizontal/grid rows by comparing pointer position against sibling bounding boxes. Editor UI marked with `data-morph-editor` is excluded from drag start.

**UI components**:
- **SelectionOverlay** — Blue outline around selected element (positioned via `getBoundingClientRect`)
- **DragHandleLayer** — Fixed-position grip handles aligned beside decorated elements
- **DndSortManager** — Native pointer-event drag manager that reorders sibling paths
- **DropIndicator** — Before/after insertion marker for vertical and horizontal layouts
- **PropertyPanel** — Right sidebar (~300px):
  - Element path display (debug info)
  - Tab 1 — Manual: visibility toggle, text editor, color picker, size control, reset buttons
  - Tab 2 — AI: prompt textarea + submit button
  - Each change → `POST /override` → backend validates → confirmed
- **Toolbar** — Floating bar with Save and Exit Edit Mode buttons
- Hidden elements in edit mode render at 30% opacity with a "hidden" badge

**Zero external dependencies in the library** — native inputs only, styles via injected `<style>` tag with `.morph-editor-*` namespace.

### 7. Backend API

**Endpoints** (Express):
- `GET /config/:userId/:viewId` — Returns full overrides JSON. Returns `{}` if no config exists.
- `POST /override` — Validate and apply a single override change. Body: `{ userId, viewId, path, type, changes?, prompt? }`. Returns updated full config.

**Validation service** (`validationService.ts`):
- Sanitize text values (strip script tags, dangerous HTML)
- Validate CSS property values (whitelist safe properties)
- Validate style value formats (no `url()`, `expression()`, etc.)
- Business rules (future: configurable per SaaS instance)

**Schema**:
```sql
CREATE TABLE morph_configs (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(255) NOT NULL,
  view_id     VARCHAR(255) NOT NULL,
  overrides   JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, view_id)
);
```

---

## React Compatibility

Must work on React 17, 18, and 19. Constraints:
- No `useId()`, `useSyncExternalStore`, or `use()` — all React 18+/19+ only
- Stick to: `useState`, `useReducer`, `useEffect`, `useContext`, `useRef`, `useCallback`, `useMemo`

---

## Implementation Order

### Step 1 — Scaffold
- pnpm workspace, root config, per-package `package.json` and `tsconfig.json`
- Vite lib config for `packages/react`, Vite app config for `packages/demo`
- `.gitignore`
- Verify `pnpm dev` and `pnpm build` work

### Step 2 — Types + Config Layer
- `types.ts` — all shared types (`ElementOverride`, `MorphConfig`, `MorphProps`, reducer actions)
- `configReducer.ts` — pure reducer (SET_CONFIG, SET_OVERRIDE, REMOVE_OVERRIDE)
- `ConfigContext.tsx` — provider + `useMorphContext` hook
- `apiClient.ts` — fetch wrapper (`getConfig`, `postOverride`)

### Step 3 — Tree Walker (most critical)
- `pathUtils.ts` — `buildSegment`, `computeTypeScopedIndex`, `buildPath`
- `applyOverrides.ts` — style merging, text detection, hidden handling
- `walkTree.ts` — recursive walker
- Unit tests: path determinism, override application, edge cases (fragments, conditionals, deep nesting)

### Step 4 — Morph Component (View Mode)
- `Morph.tsx` — assemble context + fetch + walkTree + render
- `index.ts` — barrel exports
- Test in demo with hardcoded config, then with API

### Step 5 — Backend API
- DB migration, pg client, error handler
- Validation service (CSS sanitization, text sanitization)
- Config service (get config, apply override + validate + persist)
- Routes (GET config, POST override)
- Express app + server entry
- Test with curl

### Step 6 — Edit Mode UI (largest effort)
- `EditModeProvider.tsx` — overlay shell, event suppression
- `SelectionOverlay.tsx` — positioned highlight
- `DndSortManager.tsx` — pointer-event drag/move manager
- `DragHandleLayer.tsx` — generated grip handles for decorated elements
- `DropIndicator.tsx` — before/after drop marker
- `PropertyPanel.tsx` with tabbed layout (Manual / AI Prompt)
- Manual controls: TextEditor, ColorPicker, SizeControl, VisibilityToggle
- `AiPromptInput.tsx` — textarea + submit (sends to `POST /override` with `type: "ai_prompt"`)
- Wire into walkTree (MorphEditable wrapper in edit mode)
- Each edit → POST /override → update local config on success
- Drag sibling → dispatch `REORDER_CHILDREN` → persist `childOrder`
- Full flow test: edit → validate → persist → reload → verify

### Step 7 — Demo + Polish
- `SampleDashboard.tsx` with realistic UI elements
- Error boundary around morph tree
- `onSave`/`onError` callback support
- Build verification (ESM + CJS)

---

## Verification Plan

1. **Unit tests**: Tree walker paths are deterministic; overrides apply correctly; reducer works
2. **Backend tests**: POST /override validates and rejects bad CSS/XSS text; GET returns correct scoped config
3. **Integration test**: Demo app → edit mode → click element → change color → backend validates → reload → color persists
4. **AI prompt flow**: Click element → AI tab → type prompt → POST /override with type ai_prompt → backend receives it (AI processing is out of scope, but the plumbing works)
5. **Drag/move flow**: Demo app → edit mode → drag an element or grip handle → drop before/after a sibling → `childOrder` updates → save/reload preserves order
6. **Edge cases**: Conditional rendering doesn't break sibling paths; deeply nested trees; fragments; vertical lists; horizontal/grid sibling layouts
