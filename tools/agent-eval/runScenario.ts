import type { AgentMessageRequest } from '../../api/src/types.js';
import { runLayoutAgent } from '../../api/src/services/layoutAgent.js';
import type { AgentScenario, ScenarioRunResult } from './types.js';

export function scenarioToRequest(
  scenario: AgentScenario,
  instructionsOverride?: string,
): AgentMessageRequest {
  return {
    userId: scenario.userId ?? 'eval-user',
    viewId: scenario.viewId ?? 'eval-view',
    message: scenario.message,
    config: scenario.config,
    snapshot: scenario.snapshot,
    selectedPath: scenario.selectedPath,
    selectionLabel: scenario.selectionLabel,
    instructionsOverride,
  };
}

export async function runScenario(
  scenario: AgentScenario,
  instructionsOverride?: string,
): Promise<ScenarioRunResult> {
  const request = scenarioToRequest(scenario, instructionsOverride);
  const response = await runLayoutAgent(request);
  return { request, response };
}
