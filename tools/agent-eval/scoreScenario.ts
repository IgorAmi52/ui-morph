import type { ElementOverride, MorphConfig } from '../../packages/api/src/types.js';
import { LAYOUT_AGENT_INSTRUCTIONS_VERSION } from '../../packages/api/src/agent/layoutInstructions.js';
import type { AgentScenario, ScenarioRunResult, ScenarioScore } from './types.js';

function partialMatch(
  actual: ElementOverride | undefined,
  expected: Partial<ElementOverride>,
): boolean {
  if (!actual) return false;
  if (expected.hidden !== undefined && actual.hidden !== expected.hidden) return false;
  if (expected.text !== undefined && actual.text !== expected.text) return false;
  if (expected.style) {
    for (const [k, v] of Object.entries(expected.style)) {
      if (actual.style?.[k] !== v) return false;
    }
  }
  if (expected.childOrder) {
    if (
      !actual.childOrder ||
      actual.childOrder.length !== expected.childOrder.length ||
      !actual.childOrder.every((s, i) => s === expected.childOrder![i])
    ) {
      return false;
    }
  }
  return true;
}

function configAt(config: MorphConfig | undefined, path: string): ElementOverride | undefined {
  if (!config) return undefined;
  return config[path] ?? config.morph;
}

type Check = { label: string; pass: boolean; detail?: string };

export function scoreScenarioRun(
  scenario: AgentScenario,
  run: ScenarioRunResult,
): ScenarioScore {
  const { response } = run;
  const expect = scenario.expect;
  const checks: Check[] = [];

  if (expect.toolsSucceeded !== undefined) {
    const hasErrors = (response.toolErrors?.length ?? 0) > 0;
    const pass = expect.toolsSucceeded ? !hasErrors : hasErrors;
    checks.push({
      label: 'toolsSucceeded',
      pass,
      detail: hasErrors ? response.toolErrors?.join('; ') : undefined,
    });
  }

  if (expect.noProposedConfig) {
    checks.push({
      label: 'noProposedConfig',
      pass: response.proposedConfig === undefined,
      detail:
        response.proposedConfig !== undefined
          ? 'Agent proposed config changes unexpectedly'
          : undefined,
    });
  }

  if (expect.appliedToolsIncludes) {
    for (const tool of expect.appliedToolsIncludes) {
      const pass = response.appliedTools?.includes(tool) ?? false;
      checks.push({
        label: `appliedToolsIncludes:${tool}`,
        pass,
        detail: pass ? undefined : `Expected tool ${tool} in ${JSON.stringify(response.appliedTools)}`,
      });
    }
  }

  if (expect.appliedToolsExcludes) {
    for (const tool of expect.appliedToolsExcludes) {
      const pass = !(response.appliedTools?.includes(tool) ?? false);
      checks.push({
        label: `appliedToolsExcludes:${tool}`,
        pass,
        detail: pass ? undefined : `Tool ${tool} should not have been used`,
      });
    }
  }

  const proposed = response.proposedConfig;

  if (expect.configHas) {
    for (const [path, want] of Object.entries(expect.configHas)) {
      const actual = proposed?.[path];
      const pass = partialMatch(actual, want);
      checks.push({
        label: `configHas:${path}`,
        pass,
        detail: pass
          ? undefined
          : `Expected ${JSON.stringify(want)}, got ${JSON.stringify(actual)}`,
      });
    }
  }

  if (expect.configPathKeys) {
    for (const path of expect.configPathKeys) {
      const pass = proposed !== undefined && path in proposed;
      checks.push({
        label: `configPathKeys:${path}`,
        pass,
        detail: pass ? undefined : `Missing path ${path} in proposed config`,
      });
    }
  }

  if (expect.childOrderAt) {
    const { path, order } = expect.childOrderAt;
    const entry = configAt(proposed, path);
    const pass =
      entry?.childOrder !== undefined &&
      entry.childOrder.length === order.length &&
      entry.childOrder.every((s, i) => s === order[i]);
    checks.push({
      label: `childOrderAt:${path}`,
      pass,
      detail: pass
        ? undefined
        : `Expected childOrder ${JSON.stringify(order)}, got ${JSON.stringify(entry?.childOrder)}`,
    });
  }

  const replyLower = response.reply.toLowerCase();

  if (expect.replyMustNotMatch) {
    for (const phrase of expect.replyMustNotMatch) {
      const pass = !replyLower.includes(phrase.toLowerCase());
      checks.push({
        label: `replyMustNotMatch:${phrase}`,
        pass,
        detail: pass ? undefined : `Reply leaked jargon: "${phrase}"`,
      });
    }
  }

  if (expect.replyMustMatch) {
    for (const phrase of expect.replyMustMatch) {
      const pass = replyLower.includes(phrase.toLowerCase());
      checks.push({
        label: `replyMustMatch:${phrase}`,
        pass,
        detail: pass ? undefined : `Reply missing expected phrase: "${phrase}"`,
      });
    }
  }

  if (expect.replyMustMatchAny && expect.replyMustMatchAny.length > 0) {
    const pass = expect.replyMustMatchAny.some((phrase) =>
      replyLower.includes(phrase.toLowerCase()),
    );
    checks.push({
      label: 'replyMustMatchAny',
      pass,
      detail: pass
        ? undefined
        : `Reply missing any of: ${expect.replyMustMatchAny.join(', ')}`,
    });
  }

  if (expect.minAppliedTools !== undefined) {
    const count = response.appliedTools?.length ?? 0;
    const pass = count >= expect.minAppliedTools;
    checks.push({
      label: `minAppliedTools:${expect.minAppliedTools}`,
      pass,
      detail: pass
        ? undefined
        : `Expected >= ${expect.minAppliedTools} tool calls, got ${count}`,
    });
  }

  if (checks.length === 0) {
    checks.push({ label: 'default', pass: true });
  }

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;
  const score = total > 0 ? passed / total : 0;

  const failed = checks.filter((c) => !c.pass);
  const feedback =
    failed.length === 0
      ? `All ${total} checks passed.`
      : failed
          .map((c) => `${c.label}: ${c.detail ?? 'failed'}`)
          .join('\n');

  return {
    scenarioId: scenario.id,
    score,
    passed,
    total,
    feedback: `[${scenario.id}] ${feedback}`,
  };
}

export function scoreScenarioStub(
  scenario: AgentScenario,
  run: ScenarioRunResult,
): ScenarioScore {
  return scoreScenarioRun(scenario, run);
}

export { LAYOUT_AGENT_INSTRUCTIONS_VERSION };
