#!/usr/bin/env npx tsx
/**
 * Golden-scenario eval for the layout agent.
 * Usage:
 *   pnpm eval:agent [--split train|val|all]
 *   pnpm eval:agent:score [--split val] [--instructions path.md]
 */
import { readFile, readFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYOUT_AGENT_INSTRUCTIONS_VERSION } from '../../packages/api/src/agent/layoutInstructions.js';
import { loadScenarios } from './loadScenarios.js';
import { runScenario } from './runScenario.js';
import { scoreScenarioRun } from './scoreScenario.js';
import type { EvalResult, ScenarioSplit } from './types.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadEnvFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env optional until first Gemini call
  }
}

loadEnvFile(path.join(repoRoot, 'packages/api/.env'));

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseArgs(argv: string[]): {
  split: ScenarioSplit | 'all';
  instructionsPath?: string;
  jsonOnly: boolean;
} {
  let split: ScenarioSplit | 'all' = 'all';
  let instructionsPath: string | undefined;
  let jsonOnly = false;

  const args = argv.filter((a) => a !== '--');
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--split' && args[i + 1]) {
      split = args[++i] as ScenarioSplit | 'all';
    } else if (arg === '--instructions' && args[i + 1]) {
      instructionsPath = args[++i];
    } else if (arg === '--json') {
      jsonOnly = true;
    }
  }
  return { split, instructionsPath, jsonOnly };
}

async function main(): Promise<void> {
  const { split, instructionsPath, jsonOnly } = parseArgs(process.argv.slice(2));

  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error('GEMINI_API_KEY is not set. Add it to packages/api/.env');
    process.exit(1);
  }

  let instructionsOverride: string | undefined;
  if (instructionsPath) {
    if (instructionsPath === '-') {
      instructionsOverride = await readStdin();
    } else {
      instructionsOverride = await readFileAsync(
        path.isAbsolute(instructionsPath)
          ? instructionsPath
          : path.join(process.cwd(), instructionsPath),
        'utf8',
      );
    }
  }

  const scenarios = await loadScenarios(split);
  if (scenarios.length === 0) {
    console.error(`No scenarios for split=${split}`);
    process.exit(1);
  }

  const scores = [];
  const traces: string[] = [];

  for (const scenario of scenarios) {
    const run = await runScenario(scenario, instructionsOverride);
    const scored = scoreScenarioRun(scenario, run);
    scores.push(scored);
    traces.push(scored.feedback);
    if (!jsonOnly) {
      console.log(
        `${scored.scenarioId}: ${(scored.score * 100).toFixed(0)}% (${scored.passed}/${scored.total})`,
      );
      if (scored.score < 1) console.log(`  ${scored.feedback}`);
    }
  }

  const meanScore =
    scores.length > 0 ? scores.reduce((a, s) => a + s.score, 0) / scores.length : 0;

  const result: EvalResult = {
    version: LAYOUT_AGENT_INSTRUCTIONS_VERSION,
    split,
    meanScore,
    scenarios: scores,
    feedback: traces.join('\n\n'),
  };

  if (jsonOnly) {
    // Single line so subprocess parsers (GEPA) are not confused by pretty-print or pnpm noise
    console.log(JSON.stringify(result));
    process.exit(0);
  }

  console.log(
    `\nMean score (${split}): ${(meanScore * 100).toFixed(1)}% [${LAYOUT_AGENT_INSTRUCTIONS_VERSION}]`,
  );
  process.exit(meanScore >= 1 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
