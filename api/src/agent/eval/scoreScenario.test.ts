import { describe, expect, it } from 'vitest';
import { scoreScenarioRun } from '../../../../tools/agent-eval/scoreScenario.js';
import type { AgentScenario, ScenarioRunResult } from '../../../../tools/agent-eval/types.js';

const baseScenario: AgentScenario = {
  id: 'test-hide',
  split: 'train',
  message: 'hide title',
  config: {},
  snapshot: {
    viewId: 'v',
    nodeCount: 1,
    nodes: [
      {
        path: 'morph.div:0.h1:0',
        tag: 'h1',
        segment: 'h1:0',
        textLeaf: true,
        hidden: false,
        text: 'Hi',
        children: [],
      },
    ],
  },
  expect: {
    toolsSucceeded: true,
    configHas: { 'morph.div:0.h1:0': { hidden: true } },
    replyMustNotMatch: ['parentPath'],
  },
};

function run(partial: Partial<ScenarioRunResult['response']>): ScenarioRunResult {
  return {
    request: {
      userId: 'u',
      viewId: 'v',
      message: 'x',
      config: {},
      snapshot: baseScenario.snapshot,
    },
    response: {
      reply: 'I hid the title for you.',
      ...partial,
    },
  };
}

describe('scoreScenarioRun', () => {
  it('scores 100% when all expectations pass', () => {
    const result = scoreScenarioRun(
      baseScenario,
      run({
        proposedConfig: { 'morph.div:0.h1:0': { hidden: true } },
        appliedTools: ['set_element_override'],
      }),
    );
    expect(result.score).toBe(1);
    expect(result.passed).toBe(result.total);
  });

  it('fails when tool errors present but toolsSucceeded required', () => {
    const result = scoreScenarioRun(
      baseScenario,
      run({
        toolErrors: ['set_element_override: bad path'],
        proposedConfig: {},
        appliedTools: ['set_element_override'],
      }),
    );
    expect(result.score).toBeLessThan(1);
    expect(result.feedback).toMatch(/toolsSucceeded/);
  });

  it('fails jargon leak checks', () => {
    const result = scoreScenarioRun(
      baseScenario,
      run({
        reply: 'Updated parentPath morph.div:0',
        proposedConfig: { 'morph.div:0.h1:0': { hidden: true } },
        appliedTools: ['set_element_override'],
      }),
    );
    expect(result.feedback).toMatch(/replyMustNotMatch/);
  });

  it('validates childOrderAt on morph root', () => {
    const scenario: AgentScenario = {
      ...baseScenario,
      id: 'reorder',
      expect: {
        childOrderAt: { path: 'morph', order: ['section:1', 'section:0'] },
      },
    };
    const pass = scoreScenarioRun(
      scenario,
      run({ proposedConfig: { morph: { childOrder: ['section:1', 'section:0'] } } }),
    );
    expect(pass.score).toBe(1);

    const fail = scoreScenarioRun(
      scenario,
      run({ proposedConfig: { morph: { childOrder: ['section:0', 'section:1'] } } }),
    );
    expect(fail.score).toBe(0);
  });

  it('passes replyMustMatchAny when one phrase matches', () => {
    const scenario: AgentScenario = {
      ...baseScenario,
      expect: { replyMustMatchAny: ['yes', 'hidden'] },
    };
    const pass = scoreScenarioRun(scenario, run({ reply: 'Yes, it is hidden.' }));
    expect(pass.score).toBe(1);
  });

  it('requires no proposed config for Q&A scenarios', () => {
    const scenario: AgentScenario = {
      ...baseScenario,
      expect: { noProposedConfig: true, replyMustMatch: ['title'] },
    };
    const pass = scoreScenarioRun(scenario, run({ reply: 'The title says Hi.' }));
    expect(pass.score).toBe(1);

    const fail = scoreScenarioRun(
      scenario,
      run({
        reply: 'The title says Hi.',
        proposedConfig: { 'morph.div:0.h1:0': { hidden: true } },
      }),
    );
    expect(fail.score).toBeLessThan(1);
  });
});
