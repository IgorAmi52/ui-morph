import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentScenario, ScenarioSplit } from './types.js';

const SCENARIOS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'scenarios');

export async function loadScenarios(split?: ScenarioSplit | 'all'): Promise<AgentScenario[]> {
  const files = (await readdir(SCENARIOS_DIR))
    .filter((f) => f.endsWith('.json'))
    .sort();

  const scenarios: AgentScenario[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(SCENARIOS_DIR, file), 'utf8');
    const scenario = JSON.parse(raw) as AgentScenario;
    if (split && split !== 'all' && scenario.split !== split) continue;
    scenarios.push(scenario);
  }
  return scenarios;
}
