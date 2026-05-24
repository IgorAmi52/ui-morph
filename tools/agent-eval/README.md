# Layout agent eval harness

Golden scenarios for regression-testing the Gemini layout agent.

## Run

```bash
# From repo root (requires packages/api/.env with GEMINI_API_KEY)
pnpm eval:agent
pnpm eval:agent -- --split val
pnpm eval:agent:score -- --split val     # JSON for tooling
```

## Scenarios

Each file in `scenarios/` defines `snapshot`, `message`, `config`, and `expect` checks. See `types.ts` for the expect schema.

## Baseline

`baseline_score.json` records the minimum acceptable val `meanScore` for nightly CI (with tolerance). Update after intentional prompt improvements.

## When to run GEPA

1. `pnpm eval:agent -- --split train` — if below 100%, there is room to optimize.
2. `pnpm gepa:optimize` — one batch run (not a manual loop); review `tools/gepa-opt/artifacts/`.
3. `pnpm eval:agent:score -- --split val --instructions tools/gepa-opt/artifacts/best_instructions.md` — candidate must beat val baseline before merging into `layoutInstructions.ts`.

Harder scenarios live alongside the originals (`swap-by-name`, `two-edits`, `reorder-three-sections`, etc.).
