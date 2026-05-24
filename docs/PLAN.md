# ui-morph — Implementation Plan

## Context

`@ui-morph/react` is a React wrapper component library for SaaS products. Host apps wrap a page or region with `<Morph>`, and end users can visually customize that UI in edit mode.

Current repo layout:
- `packages/react/`: publishable React library.
- `api/`: Express/Postgres backend and Gemini layout agent.
- `demo/`: insurance-themed Vite demo app.

Dev commands:
- `pnpm dev:all` or `make dev`: start Postgres, run migrations, then run the library watcher, API, and demo together.
- `pnpm dev`: watch-build only `@ui-morph/react`.
- `pnpm dev:api`: run only the API on `:3001`.
- `pnpm dev:demo`: run only the Vite demo.

Current MVP customization scope:
- Hide/show elements.
- Change safe style values such as text color, background color, font size, width, and height.
- Reorder sibling elements.
- Save and reload the resulting config through a backend.
- Send selected-element prompts to a future agent backend.

Explicitly out of scope:
- Text/content editing.
- Browser `localStorage` persistence.
- Multi-tenant API key management.
- Displaying internal element IDs or paths in the end-user editor UI.

Host apps can disable individual customization capabilities with attributes:

```tsx
<section data-morph-disable="background color">...</section>
<button data-morph-disable="ai reorder">Submit</button>
<div data-morph-disable="all">...</div>
```

Supported disable tokens:
- `visibility`
- `color`
- `background`
- `resize` (`fontSize`, `width`, and `height`)
- `reorder`
- `ai`
- `style` (`color`, `background`, and `resize`)
- `all`

`data-morph-lock` and `data-morph-locked` also disable all capabilities. Disabled capabilities are inherited by descendants.

The editor also applies a small set of implicit defaults. Headings (`h1`-`h6`) are treated as non-resizable by default. Host apps can opt back in with:

```tsx
<h1 data-morph-enable="resize">Dashboard</h1>
```

Box resizing is controlled from the selected element outline. The editor shows edge and corner handles for supported non-inline elements when resize is enabled:

```tsx
<article data-morph-resize="box">...</article>
<section data-morph-enable="resize">...</section>
```

---

## Current Frontend Contract

### `<Morph>` Usage

```tsx
<Morph
  userId={currentUser.id}
  viewId="dashboard"
  apiUrl="http://localhost:3001"
  editable
>
  <Dashboard />
</Morph>
```

Props:
- `userId`: scopes config to one end user.
- `viewId`: scopes config to one page/view. If omitted, the current pathname is used.
- `apiUrl`: optional backend base URL.
- `editable`: shows the edit-mode entry button when uncontrolled.
- `mode`: optional controlled mode, `'view' | 'edit'`.
- `onSave`: called after successful save.
- `onError`: called when config fetch/save fails.
- `fallback`: optional loading UI for remote config.

Storage behavior:
- Without `apiUrl`, the frontend uses a transient in-memory adapter. It does not persist anywhere.
- With `apiUrl`, the frontend fetches config on mount and saves the full config on Save.

### Config Shape

```ts
export interface ElementOverride {
  hidden?: boolean;
  style?: Record<string, string>;
  childOrder?: string[];
}

export type MorphConfig = Record<string, ElementOverride>;
```

Example:

```json
{
  "morph.div:0.h1:0": {
    "style": { "color": "#dc2626", "fontSize": "20px", "width": "320px" }
  },
  "morph.div:1": {
    "hidden": true
  },
  "morph.div:0": {
    "childOrder": ["section:1", "section:0", "section:2"]
  }
}
```

Notes:
- `style` keys are React-style camelCase, for example `backgroundColor`, `fontSize`, `width`, and `height`.
- `childOrder` contains child path segments, not full paths.
- No text override is supported.

### Path Stability

Element paths are internal implementation details and should not be shown to end users.

Path segment priority:
1. `data-morph-id` prop, if provided by the host app.
2. Explicit React `key`, when available.
3. Type-scoped sibling index.

Backend should treat paths as opaque strings.

---

## Backend Persistence Requirements

The backend team should implement full-config persistence first. This matches the current frontend adapter.

### `GET /config/:userId/:viewId`

Returns the saved config for `(userId, viewId)`.

Response:

```json
{
  "morph.div:0": {
    "style": { "backgroundColor": "#f8fafc" }
  }
}
```

Return `{}` when no config exists.

### `PUT /config/:userId/:viewId`

Upserts the full config for `(userId, viewId)`.

Request body:

```json
{
  "overrides": {
    "morph.div:0": {
      "style": { "backgroundColor": "#f8fafc" }
    }
  }
}
```

Response body should be the validated `MorphConfig` object, not an envelope:

```json
{
  "morph.div:0": {
    "style": { "backgroundColor": "#f8fafc" }
  }
}
```

If the backend prefers `{ "overrides": ... }` responses, the frontend adapter must be updated at the same time.

### Persistence Schema

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

Recommended indexes:

```sql
CREATE INDEX morph_configs_user_view_idx
  ON morph_configs (user_id, view_id);
```

### Validation Rules

Reject invalid configs before saving.

Allowed override keys:
- `hidden`
- `style`
- `childOrder`

Reject:
- Unknown override keys, including `text`.
- Non-object per-element values.
- Non-boolean `hidden`.
- Non-array or non-string `childOrder` entries.
- Invalid style properties or values.

Initial safe style whitelist:
- `color`
- `backgroundColor`
- `fontSize`
- `width`
- `height`

Style value rules:
- No `url(...)`.
- No `expression(...)`.
- No CSS variables unless explicitly approved.
- Colors should be hex, rgb/rgba, hsl/hsla, or named colors if the backend chooses to allow them.
- `fontSize` should be bounded, for example `1px` through `200px`.
- `width` and `height` should be bounded pixel values, for example `1px` through `4000px`.

The backend should return `400` for validation failures with a useful error payload:

```json
{
  "error": "Invalid override",
  "details": [
    { "path": "morph.div:0", "field": "style.fontSize", "message": "Font size is out of range" }
  ]
}
```

---

## Agent Feature Contract

The frontend already has an AI prompt tab, but it is not wired to a backend yet. The backend can add an agent endpoint after persistence is stable.

Recommended endpoint:

### `POST /agent/override`

Request:

```json
{
  "userId": "demo-user",
  "viewId": "dashboard",
  "path": "morph.div:0.h1:0",
  "prompt": "make this heading larger and red",
  "currentConfig": {
    "morph.div:0.h1:0": {
      "style": { "color": "#111827" }
    }
  }
}
```

Response should return the full validated config, using the same shape as `GET /config`.

```json
{
  "morph.div:0.h1:0": {
    "style": { "color": "#dc2626", "fontSize": "24px" }
  }
}
```

Agent responsibilities:
- Interpret the prompt into allowed `ElementOverride` changes.
- Never produce text/content edits.
- Only produce whitelisted style, visibility, or reorder changes.
- Run the same validation service used by `PUT /config`.
- Persist the resulting full config if the agent action is accepted.
- Return the confirmed full config.

Suggested implementation flow:
1. Load existing config for `(userId, viewId)`.
2. Ask the agent to propose a patch for the selected `path`.
3. Validate the patch against the same schema and style whitelist.
4. Merge the patch into existing config.
5. Upsert the full config.
6. Return the full config.

Prompt output should be structured, not free-form text. Example agent output:

```json
{
  "changes": {
    "style": {
      "color": "#dc2626",
      "fontSize": "24px"
    }
  }
}
```

---

## Frontend Architecture Notes

Current editor components:
- `Morph.tsx`: wraps children, loads/saves config, decorates DOM nodes, applies overrides.
- `ConfigContext.tsx`: reducer-backed config state and save callback.
- `DndSortManager.tsx`: native pointer-based sibling reorder.
- `DragHandleLayer.tsx`: generated drag handles.
- `DropIndicator.tsx`: visual drop marker.
- `SelectionOverlay.tsx`: selected element outline and edge/corner drag resize handles.
- `PropertyPanel.tsx`: manual controls and AI prompt tab.
- `ColorPicker.tsx`, `SizeControl.tsx`, `VisibilityToggle.tsx`, `AiPromptInput.tsx`.

Layout reorder is applied through CSS `order`, not DOM node moves. This avoids fighting React reconciliation.
Element width and height resize is controlled by lightweight edge and corner handles on the selected outline. Handles store bounded `style.width` and `style.height` values. North/west handles also adjust `top`/`left` for positioned elements, or `marginTop`/`marginLeft` for normal-flow elements when that can be done without creating negative margins. Resize clamps to the parent/viewport where predictable instead of running a global collision solver.
The property panel automatically moves between the left and right side of the viewport to avoid covering the selected element edge where possible.

No external runtime UI dependencies are required by the library.

---

## Implementation Order

### Frontend

1. Keep transient no-backend mode working for demo/development.
2. Wire `apiUrl` mode to backend `GET /config` and `PUT /config`.
3. Keep all manual edits local until Save.
4. On Save, send the full config.
5. Later, wire `AiPromptInput` to `POST /agent/override`.

### Backend

1. Create `morph_configs` table.
2. Implement `GET /config/:userId/:viewId`.
3. Implement `PUT /config/:userId/:viewId`.
4. Add config validation and CSS sanitization.
5. Add integration tests for load/save/reload.
6. Add `POST /agent/override` after persistence is stable.
7. Reuse the same validation pipeline for manual saves and agent output.

---

## Verification Plan

Frontend:
- Edit mode opens on first click after page load.
- Hide/show updates the preview.
- Color/background/font-size/width/height changes update the preview.
- Edge/corner drag resizing clamps to sane bounds and parent/viewport limits where predictable.
- Drag reorder updates visual order without moving DOM nodes.
- Save calls backend when `apiUrl` is provided.
- No config is persisted when `apiUrl` is omitted.

Backend:
- `GET` returns `{}` for missing config.
- `PUT` upserts valid config and returns the validated full config.
- Unknown keys such as `text` are rejected.
- Unsafe CSS values are rejected.
- Save followed by reload returns the same validated config.

Agent:
- Prompt request is scoped to `(userId, viewId, path)`.
- Agent output is structured and validated.
- Agent cannot create text/content edits.
- Agent result is persisted and returned as full config.
