import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentMessageRequest, LayoutNode } from '../types.js';

const mockSendMessage = vi.fn();

vi.mock('@google/generative-ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/generative-ai')>();
  return {
    ...actual,
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        startChat: vi.fn().mockReturnValue({
          sendMessage: mockSendMessage,
        }),
      }),
    })),
  };
});

const snapshot: AgentMessageRequest['snapshot'] = {
  viewId: 'dashboard',
  nodeCount: 2,
  nodes: [
    {
      path: 'morph.div:0.h1:0',
      tag: 'h1',
      segment: 'h1:0',
      textLeaf: true,
      hidden: false,
      text: 'Title',
      children: [],
    },
  ],
};

function legacyNode(id: string, tag = 'section', children: LayoutNode[] = []): LayoutNode {
  const parentPath = 'morph.id:legacy-claims-console.id:legacy-reorderable-module-board';
  return {
    path: `${parentPath}.id:${id}`,
    tag,
    segment: `id:${id}`,
    textLeaf: false,
    hidden: false,
    children,
  };
}

function textNode(parentPath: string, tag: string, index: number, text: string): LayoutNode {
  return {
    path: `${parentPath}.${tag}:${index}`,
    tag,
    segment: `${tag}:${index}`,
    text,
    textLeaf: true,
    hidden: false,
    children: [],
  };
}

function legacyMetric(id: string): LayoutNode {
  const metric = legacyNode(id, 'article');
  metric.children = [textNode(metric.path, 'strong', 0, '42')];
  return metric;
}

function legacyPanel(id: string): LayoutNode {
  const panel = legacyNode(id);
  panel.children = [textNode(panel.path, 'h2', 0, id)];
  return panel;
}

const legacySnapshot: AgentMessageRequest['snapshot'] = {
  viewId: 'large-loss',
  rootPath: 'morph',
  nodeCount: 44,
  nodes: [
    {
      path: 'morph.id:legacy-claims-console',
      tag: 'div',
      segment: 'id:legacy-claims-console',
      textLeaf: false,
      hidden: false,
      children: [
        {
          path: 'morph.id:legacy-claims-console.id:legacy-reorderable-module-board',
          tag: 'div',
          segment: 'id:legacy-reorderable-module-board',
          textLeaf: false,
          hidden: false,
          children: [
            legacyNode('legacy-console-topbar', 'header'),
            legacyNode('global-alert-strip'),
            legacyNode('legacy-tab-overflow', 'nav'),
            legacyNode('filter-toolbar'),
            legacyNode('left-service-navigation', 'aside'),
            legacyNode('active-filter-cloud'),
            legacyMetric('metric-auth-ovr'),
            legacyMetric('metric-cov-hold'),
            legacyMetric('metric-vnd-sla'),
            legacyMetric('metric-res-delta'),
            legacyMetric('metric-siu-subro'),
            legacyMetric('metric-doc-err'),
            legacyMetric('metric-fnol-lag'),
            legacyMetric('metric-lit-hold'),
            legacyPanel('reserve-trend-dashboard'),
            legacyPanel('sla-heatmap-dashboard'),
            legacyPanel('queue-aging-dashboard'),
            legacyPanel('region-exposure-dashboard'),
            legacyPanel('authority-funnel-dashboard'),
            legacyPanel('claim-workload-table'),
            legacyPanel('selected-file-record'),
            legacyPanel('reserve-layer-stack'),
            legacyPanel('rule-diagnostics'),
            legacyPanel('coverage-question-stack'),
            legacyPanel('batch-job-monitor'),
            legacyPanel('vendor-sla-panel'),
            legacyPanel('compliance-checklist'),
            legacyPanel('audit-timeline'),
            legacyPanel('raw-system-payload'),
            legacyPanel('system-health-dashboard'),
          ],
        },
      ],
    },
  ],
};

function toolResponse(name: string, args: Record<string, unknown>) {
  return {
    response: {
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name, args } }],
          },
        },
      ],
      text: () => '',
    },
  };
}

function textResponse(text: string) {
  return {
    response: {
      candidates: [{ content: { parts: [{ text }] } }],
      text: () => text,
    },
  };
}

describe('runLayoutAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('applies tool calls and returns proposedConfig', async () => {
    mockSendMessage
      .mockResolvedValueOnce(
        toolResponse('set_element_override', {
          path: 'morph.div:0.h1:0',
          hidden: true,
        }),
      )
      .mockResolvedValueOnce(textResponse('I hid the title.'));

    const { runLayoutAgent } = await import('./layoutAgent.js');
    const result = await runLayoutAgent({
      userId: 'u',
      viewId: 'v',
      message: 'Hide the title',
      config: {},
      snapshot,
    });

    expect(result.proposedConfig?.['morph.div:0.h1:0']).toEqual({ hidden: true });
    expect(result.appliedTools).toContain('set_element_override');
    expect(result.reply).toBe('I hid the title.');
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
  });

  it('records toolErrors when executor rejects', async () => {
    mockSendMessage
      .mockResolvedValueOnce(
        toolResponse('set_element_override', {
          path: 'morph.missing:0',
          hidden: true,
        }),
      )
      .mockResolvedValueOnce(textResponse('Sorry, I could not do that.'));

    const { runLayoutAgent } = await import('./layoutAgent.js');
    const result = await runLayoutAgent({
      userId: 'u',
      viewId: 'v',
      message: 'Hide something',
      config: {},
      snapshot,
    });

    expect(result.toolErrors?.length).toBeGreaterThan(0);
    expect(result.proposedConfig).toBeUndefined();
  });

  it('uses instructionsOverride in system prompt', async () => {
    mockSendMessage.mockResolvedValue(textResponse('OK'));

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const { runLayoutAgent } = await import('./layoutAgent.js');

    await runLayoutAgent({
      userId: 'u',
      viewId: 'v',
      message: 'Hi',
      config: {},
      snapshot,
      instructionsOverride: 'CUSTOM_INSTRUCTIONS_BLOCK',
    });

    const client = vi.mocked(GoogleGenerativeAI).mock.results[0]?.value;
    const getModel = client.getGenerativeModel as ReturnType<typeof vi.fn>;
    expect(getModel).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining('CUSTOM_INSTRUCTIONS_BLOCK'),
      }),
    );
  });

  it('applies the fixed legacy dashboard preset without visibility changes or Gemini', async () => {
    vi.useFakeTimers();
    const { runLayoutAgent } = await import('./layoutAgent.js');
    const resultPromise = runLayoutAgent({
      userId: 'u',
      viewId: 'large-loss',
      message: 'Modernize this legacy dashboard: move KPIs and core panels to the top, widen the reserve and workload sections, compact low-priority modules, and keep every section visible.',
      selectedPath: 'morph.id:legacy-claims-console',
      config: {},
      snapshot: legacySnapshot,
    });
    await vi.advanceTimersByTimeAsync(650);
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.appliedTools).toEqual(['legacy_console_transform']);
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(result.reply).toContain('kept every section visible');

    const proposed = result.proposedConfig ?? {};
    expect(Object.values(proposed).some((override) => override.hidden !== undefined)).toBe(false);
    expect(
      proposed['morph.id:legacy-claims-console.id:legacy-reorderable-module-board']
        ?.childOrder,
    ).toEqual([
      'id:legacy-console-topbar',
      'id:filter-toolbar',
      'id:metric-auth-ovr',
      'id:metric-cov-hold',
      'id:metric-vnd-sla',
      'id:metric-res-delta',
      'id:reserve-trend-dashboard',
      'id:claim-workload-table',
      'id:sla-heatmap-dashboard',
      'id:queue-aging-dashboard',
      'id:region-exposure-dashboard',
      'id:authority-funnel-dashboard',
      'id:selected-file-record',
      'id:reserve-layer-stack',
      'id:vendor-sla-panel',
      'id:system-health-dashboard',
      'id:global-alert-strip',
      'id:legacy-tab-overflow',
      'id:left-service-navigation',
      'id:active-filter-cloud',
      'id:metric-siu-subro',
      'id:metric-doc-err',
      'id:metric-fnol-lag',
      'id:metric-lit-hold',
      'id:rule-diagnostics',
      'id:coverage-question-stack',
      'id:batch-job-monitor',
      'id:compliance-checklist',
      'id:audit-timeline',
      'id:raw-system-payload',
    ]);
    expect(
      proposed['morph.id:legacy-claims-console.id:legacy-reorderable-module-board.id:reserve-trend-dashboard']
        ?.style,
    ).toEqual(expect.objectContaining({
      gridColumn: 'span 8',
      backgroundColor: '#eff6ff',
      borderRadius: '8px',
    }));
    expect(
      proposed['morph.id:legacy-claims-console.id:legacy-reorderable-module-board.id:metric-auth-ovr']
        ?.style,
    ).toEqual(expect.objectContaining({
      gridColumn: 'span 3',
      padding: '12px',
      borderRadius: '8px',
    }));
    expect(
      proposed['morph.id:legacy-claims-console.id:legacy-reorderable-module-board.id:raw-system-payload']
        ?.style,
    ).toEqual(expect.objectContaining({
      gridColumn: 'span 3',
      maxHeight: '168px',
      overflow: 'hidden',
    }));
  });
});
