# GEPA layout agent optimization

Offline prompt evolution for the static instructions in [`layoutInstructions.ts`](../../api/src/agent/layoutInstructions.ts).

## Prerequisites

- Node 18+, pnpm (`pnpm install` at repo root)
- Python 3.10+ with [uv](https://github.com/astral-sh/uv)
- `GEMINI_API_KEY` in `api/.env` (runs real agent scenarios per eval)
- Reflection LM for GEPA (default `gemini/gemini-2.0-flash` via `GEPA_REFLECTION_LM`)

## Quick start

```bash
# From repo root
pnpm install
cd tools/gepa-opt && uv sync
```

Uses `GEMINI_API_KEY` from `api/.env` automatically (same as `pnpm eval:agent`).

`uv sync` installs `gepa[full]` (includes `litellm` for reflection). First run: `cd tools/gepa-opt && uv sync`.

Optional overrides:

```bash
# optional:
export GEPA_MAX_METRIC_CALLS=10
export GEPA_REFLECTION_LM=gemini/gemini-2.0-flash

pnpm gepa:optimize
```

Outputs:

- `artifacts/best_instructions.md` — candidate to review and merge into `layoutInstructions.ts`
- `artifacts/metadata.json` — train/val scores
- `artifacts/traces.txt` — eval feedback used during reflection

## Eval only (no GEPA)

```bash
pnpm eval:agent              # all scenarios, human-readable
pnpm eval:agent -- --split val
pnpm eval:agent:score        # JSON for scripts
```

## Cost

Each GEPA `max_metric_calls` iteration runs the full golden scenario trainset against Gemini. Start with `GEPA_MAX_METRIC_CALLS=50` and increase once stable.

## CI

Nightly workflow runs val eval and optional GEPA when secrets are configured. See `.github/workflows/agent-eval.yml`.
