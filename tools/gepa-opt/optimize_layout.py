#!/usr/bin/env python3
"""
Optimize layout agent static instructions with GEPA.

Requires: GEMINI_API_KEY (eval), and reflection LM credentials per GEPA docs
(often OPENAI_API_KEY or same Gemini key depending on reflection_lm).

Usage (from repo root):
  cd tools/gepa-opt && uv run optimize_layout.py
  pnpm gepa:optimize
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
API_ENV_PATH = REPO_ROOT / "packages/api/.env"
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
SEED_PATH = Path(__file__).resolve().parent / "seed_instructions.md"


def load_env_file(path: Path) -> None:
    """Load packages/api/.env into os.environ (same as tools/agent-eval/run_eval.ts)."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        if key and key not in os.environ:
            os.environ[key] = value


def load_seed() -> str:
    if SEED_PATH.is_file():
        return SEED_PATH.read_text(encoding="utf-8")
    seed_ts = REPO_ROOT / "packages/api/src/agent/layoutInstructions.ts"
    raise FileNotFoundError(
        f"Missing seed at {SEED_PATH}. Copy instructions from {seed_ts} or run export script."
    )


def parse_eval_stdout(stdout: str) -> dict:
    """Extract EvalResult JSON from subprocess output (skip pnpm lifecycle lines)."""
    chunks: list[str] = []
    for line in stdout.splitlines():
        stripped = line.strip()
        if stripped.startswith(">"):
            continue
        chunks.append(line)
    text = "\n".join(chunks).strip()
    start = text.find("{")
    if start == -1:
        raise ValueError("no JSON object in stdout")
    obj, _end = json.JSONDecoder().raw_decode(text[start:])
    return obj


def run_eval(candidate: str, split: str = "train") -> dict:
    import tempfile

    tsx = REPO_ROOT / "packages/api/node_modules/.bin/tsx"
    run_eval_ts = REPO_ROOT / "tools/agent-eval/run_eval.ts"
    if not tsx.is_file():
        raise FileNotFoundError(f"tsx not found at {tsx}; run pnpm install at repo root")

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".md", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(candidate)
        tmp_path = tmp.name

    proc = subprocess.run(
        [
            str(tsx),
            str(run_eval_ts),
            "--split",
            split,
            "--instructions",
            tmp_path,
            "--json",
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        env={**os.environ},
    )
    Path(tmp_path).unlink(missing_ok=True)
    stdout = proc.stdout or ""
    stderr = proc.stderr or ""
    if proc.returncode != 0:
        raise RuntimeError(
            f"eval failed (code {proc.returncode}):\n{stderr}\n{stdout}"
        )
    try:
        return parse_eval_stdout(stdout)
    except (ValueError, json.JSONDecodeError) as e:
        raise RuntimeError(
            f"Could not parse eval JSON: {e}\nstdout:\n{stdout}\nstderr:\n{stderr}"
        ) from e


def main() -> None:
    load_env_file(API_ENV_PATH)

    try:
        import gepa.optimize_anything as oa
        from gepa.optimize_anything import (
            GEPAConfig,
            EngineConfig,
            ReflectionConfig,
            optimize_anything,
        )
    except ImportError as e:
        print("Install deps: cd tools/gepa-opt && uv sync", file=sys.stderr)
        raise SystemExit(1) from e

    if not os.environ.get("GEMINI_API_KEY", "").strip():
        print(
            "GEMINI_API_KEY is required for scenario eval.\n"
            f"Set it in {API_ENV_PATH} (see packages/api/.env.example).",
            file=sys.stderr,
        )
        raise SystemExit(1)

    seed = load_seed()
    max_calls = int(os.environ.get("GEPA_MAX_METRIC_CALLS", "10"))
    reflection_lm = os.environ.get(
        "GEPA_REFLECTION_LM",
        os.environ.get("GEPA_REFLECTION_MODEL", "gemini/gemini-2.5-flash"),
    )

    traces: list[str] = []

    def evaluate(candidate: str) -> float:
        result = run_eval(candidate, split="train")
        score = float(result.get("meanScore", 0))
        feedback = result.get("feedback", "")
        traces.append(feedback)
        oa.log(f"meanScore={score:.3f}\n{feedback}")
        return score

    print(f"Starting GEPA (max_metric_calls={max_calls}, reflection_lm={reflection_lm})")

    result = optimize_anything(
        seed_candidate=seed,
        evaluator=evaluate,
        objective=(
            "Optimize the system instructions for a layout customization assistant. "
            "The agent must use morph paths and segment IDs correctly for reorder_children, "
            "speak in plain non-technical language to end users, and apply minimal edits."
        ),
        config=GEPAConfig(
            engine=EngineConfig(
                max_metric_calls=max_calls,
                cache_evaluation=True,
            ),
            reflection=ReflectionConfig(reflection_lm=reflection_lm),
        ),
    )

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    best_path = ARTIFACTS_DIR / "best_instructions.md"
    best_path.write_text(result.best_candidate, encoding="utf-8")

    train_score = (
        result.val_aggregate_scores[result.best_idx]
        if result.val_aggregate_scores and result.best_idx is not None
        else None
    )
    meta = {
        "meanScoreTrain": train_score,
        "maxMetricCalls": max_calls,
        "reflectionLm": reflection_lm,
        "totalMetricCalls": result.total_metric_calls,
    }
    val = run_eval(result.best_candidate, split="val")
    meta["meanScoreVal"] = val.get("meanScore")
    meta["valFeedback"] = val.get("feedback", "")[:4000]

    (ARTIFACTS_DIR / "metadata.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )
    (ARTIFACTS_DIR / "traces.txt").write_text("\n\n---\n\n".join(traces), encoding="utf-8")

    print(f"Best instructions written to {best_path}")
    train_s = meta["meanScoreTrain"]
    val_s = meta["meanScoreVal"]
    train_label = f"{train_s:.3f}" if train_s is not None else "n/a"
    val_label = f"{val_s:.3f}" if val_s is not None else "n/a"
    print(f"Train score: {train_label}, Val score: {val_label}")


if __name__ == "__main__":
    main()
