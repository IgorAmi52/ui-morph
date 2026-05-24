import { GoogleGenerativeAI, type Content, type FunctionCall } from '@google/generative-ai';
import type { AgentMessageRequest, AgentMessageResponse, ElementOverride, LayoutNode, MorphConfig } from '../types.js';
import { buildSystemPrompt } from '../agent/prompts.js';
import { LAYOUT_AGENT_TOOLS } from '../agent/tools.js';
import {
  deriveEditScope,
  executeApplyScopedOverrides,
  executeRemoveElementOverride,
  executeReorderChildren,
  executeResizeBox,
  executeResizeGridItem,
  executeSetElementOverride,
  executeSetStyle,
  executeSetText,
  mergeOverride,
} from '../agent/toolExecutors.js';
import { summarizeConfigChanges } from '../agent/configDiff.js';
import { ValidationError } from './validationService.js';

const MAX_TOOL_ROUNDS = 8;
const HIDE_SELECTED_INTENT = new RegExp([
  '\\b(delete|remove|hide|dismiss)\\s+(this|that|it|selected)(\\s+(section|card|panel|block|element))?\\b',
  '\\bget\\s+rid\\s+of\\s+(this|that|it|selected)(\\s+(section|card|panel|block|element))?\\b',
  '\\btake\\s+(this|that|it|selected)\\s+away\\b',
].join('|'), 'i');
const LEGACY_CONSOLE_TRANSFORM_INTENT =
  /\btransform\s+this\s+legacy\s+console\b|\bmake\s+this\s+legacy\s+console\b|\brestructure\s+this\s+legacy\s+console\b|\bmodernize\s+this\s+legacy\s+dashboard\b/i;

function getModelName(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
}

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    throw new ValidationError('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

function runTool(
  name: string,
  args: Record<string, unknown>,
  config: MorphConfig,
  snapshot: AgentMessageRequest['snapshot'],
  scope: NonNullable<AgentMessageRequest['editScope']>,
): { config: MorphConfig; label: string } {
  switch (name) {
    case 'set_element_override':
      return {
        label: name,
        config: executeSetElementOverride(config, snapshot, args as {
          path: string;
          hidden?: boolean;
          text?: string;
          style?: Record<string, string>;
        }, scope),
      };
    case 'apply_scoped_overrides':
      return {
        label: name,
        config: executeApplyScopedOverrides(config, snapshot, args as {
          changes: Array<{
            path: string;
            hidden?: boolean;
            text?: string;
            style?: Record<string, string>;
          }>;
        }, scope),
      };
    case 'resize_grid_item':
      return {
        label: name,
        config: executeResizeGridItem(config, snapshot, args as {
          path: string;
          columnSpan: number;
        }, scope),
      };
    case 'resize_box':
      return {
        label: name,
        config: executeResizeBox(config, snapshot, args as {
          path: string;
          width?: number;
          height?: number;
        }, scope),
      };
    case 'set_text':
      return {
        label: name,
        config: executeSetText(config, snapshot, args as {
          path: string;
          text: string;
        }, scope),
      };
    case 'set_style':
      return {
        label: name,
        config: executeSetStyle(config, snapshot, args as {
          path: string;
          style: Record<string, string>;
        }, scope),
      };
    case 'remove_element_override':
      return {
        label: name,
        config: executeRemoveElementOverride(config, snapshot, args as { path: string }, scope),
      };
    case 'reorder_children':
      return {
        label: name,
        config: executeReorderChildren(config, snapshot, args as {
          parentPath: string;
          childOrder: string[];
        }, scope),
      };
    default:
      throw new ValidationError(`Unknown tool: ${name}`);
  }
}

function formatUserMessage(request: AgentMessageRequest): string {
  if (request.selectedPath) {
    const label = request.selectionLabel ?? 'selected element';
    return `User selected "${label}" (${request.selectedPath}); request: ${request.message}`;
  }
  return request.message;
}

function shouldHideSelected(request: AgentMessageRequest): boolean {
  if (!request.selectedPath) return false;
  return HIDE_SELECTED_INTENT.test(request.message);
}

function walkNodes(nodes: LayoutNode[], visit: (node: LayoutNode) => void): void {
  for (const node of nodes) {
    visit(node);
    walkNodes(node.children, visit);
  }
}

function findNodeById(snapshot: AgentMessageRequest['snapshot'], id: string): LayoutNode | undefined {
  let match: LayoutNode | undefined;
  walkNodes(snapshot.nodes, (node) => {
    if (!match && node.segment === `id:${id}`) match = node;
  });
  return match;
}

function findFirstDescendant(node: LayoutNode | undefined, predicate: (node: LayoutNode) => boolean): LayoutNode | undefined {
  if (!node) return undefined;
  for (const child of node.children) {
    if (predicate(child)) return child;
    const nested = findFirstDescendant(child, predicate);
    if (nested) return nested;
  }
  return undefined;
}

function nodeIsWithin(node: LayoutNode | undefined, selectedPath: string | undefined): boolean {
  if (!node || !selectedPath) return false;
  return node.path === selectedPath || node.path.startsWith(`${selectedPath}.`) || selectedPath.startsWith(`${node.path}.`);
}

function addOverride(
  changes: Array<{ path: string; override: ElementOverride }>,
  node: LayoutNode | undefined,
  override: ElementOverride,
): void {
  if (node) changes.push({ path: node.path, override });
}

function childOrderByIds(parent: LayoutNode | undefined, ids: string[]): string[] {
  if (!parent) return [];
  const segmentsById = new Map(parent.children.map((child) => [child.segment, child.segment]));
  return ids
    .map((id) => segmentsById.get(`id:${id}`))
    .filter((segment): segment is string => Boolean(segment));
}

function legacyConsoleTransform(request: AgentMessageRequest): AgentMessageResponse | null {
  if (!request.selectedPath || !LEGACY_CONSOLE_TRANSFORM_INTENT.test(request.message)) return null;

  const consoleNode = findNodeById(request.snapshot, 'legacy-claims-console');
  const boardNode = findNodeById(request.snapshot, 'legacy-reorderable-module-board');
  if (!nodeIsWithin(consoleNode, request.selectedPath) && !nodeIsWithin(boardNode, request.selectedPath)) {
    return null;
  }

  const changes: Array<{ path: string; override: ElementOverride }> = [];
  const modernOrder = childOrderByIds(boardNode, [
    'legacy-console-topbar',
    'filter-toolbar',
    'metric-auth-ovr',
    'metric-cov-hold',
    'metric-vnd-sla',
    'metric-res-delta',
    'reserve-trend-dashboard',
    'claim-workload-table',
    'sla-heatmap-dashboard',
    'queue-aging-dashboard',
    'region-exposure-dashboard',
    'authority-funnel-dashboard',
    'selected-file-record',
    'reserve-layer-stack',
    'vendor-sla-panel',
    'system-health-dashboard',
    'global-alert-strip',
    'legacy-tab-overflow',
    'left-service-navigation',
    'active-filter-cloud',
    'metric-siu-subro',
    'metric-doc-err',
    'metric-fnol-lag',
    'metric-lit-hold',
    'rule-diagnostics',
    'coverage-question-stack',
    'batch-job-monitor',
    'compliance-checklist',
    'audit-timeline',
    'raw-system-payload',
  ]);

  addOverride(changes, consoleNode, {
    style: {
      backgroundColor: '#f8fafc',
      padding: '16px',
    },
  });
  addOverride(changes, boardNode, {
    ...(modernOrder.length > 0 ? { childOrder: modernOrder } : {}),
    style: {
      gap: '14px',
    },
  });
  addOverride(changes, findNodeById(request.snapshot, 'legacy-console-topbar'), {
    style: {
      minHeight: '56px',
      padding: '12px',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      borderColor: '#bfdbfe',
      borderRadius: '8px',
      boxShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
    },
  });
  addOverride(changes, findNodeById(request.snapshot, 'filter-toolbar'), {
    style: {
      padding: '10px',
      backgroundColor: '#ffffff',
      borderColor: '#cbd5e1',
      borderRadius: '8px',
      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
    },
  });

  addOverride(changes, findNodeById(request.snapshot, 'reserve-trend-dashboard'), {
    style: {
      gridColumn: 'span 8',
      backgroundColor: '#eff6ff',
      borderColor: '#93c5fd',
      borderRadius: '8px',
      boxShadow: '0 14px 32px rgba(37, 99, 235, 0.14)',
    },
  });
  addOverride(changes, findNodeById(request.snapshot, 'claim-workload-table'), {
    style: {
      gridColumn: 'span 8',
      backgroundColor: '#f8fafc',
      borderColor: '#cbd5e1',
      borderRadius: '8px',
      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
    },
  });
  addOverride(changes, findNodeById(request.snapshot, 'sla-heatmap-dashboard'), {
    style: { gridColumn: 'span 4', backgroundColor: '#ffffff', borderRadius: '8px' },
  });
  addOverride(changes, findNodeById(request.snapshot, 'queue-aging-dashboard'), {
    style: { gridColumn: 'span 4', backgroundColor: '#ffffff', borderRadius: '8px' },
  });
  addOverride(changes, findNodeById(request.snapshot, 'region-exposure-dashboard'), {
    style: { gridColumn: 'span 4', backgroundColor: '#ffffff', borderRadius: '8px' },
  });
  addOverride(changes, findNodeById(request.snapshot, 'authority-funnel-dashboard'), {
    style: { gridColumn: 'span 4', backgroundColor: '#ffffff', borderRadius: '8px' },
  });
  addOverride(changes, findNodeById(request.snapshot, 'selected-file-record'), {
    style: { gridColumn: 'span 4', backgroundColor: '#ffffff', borderRadius: '8px' },
  });
  addOverride(changes, findNodeById(request.snapshot, 'reserve-layer-stack'), {
    style: { gridColumn: 'span 6', backgroundColor: '#ffffff', borderRadius: '8px' },
  });
  addOverride(changes, findNodeById(request.snapshot, 'vendor-sla-panel'), {
    style: { gridColumn: 'span 6', backgroundColor: '#ffffff', borderRadius: '8px' },
  });
  addOverride(changes, findNodeById(request.snapshot, 'system-health-dashboard'), {
    style: { gridColumn: 'span 4', backgroundColor: '#ffffff', borderRadius: '8px' },
  });

  [
    'global-alert-strip',
    'legacy-tab-overflow',
    'left-service-navigation',
    'active-filter-cloud',
    'rule-diagnostics',
    'coverage-question-stack',
    'batch-job-monitor',
    'compliance-checklist',
    'audit-timeline',
    'raw-system-payload',
  ].forEach((id) => {
    addOverride(changes, findNodeById(request.snapshot, id), {
      style: {
        gridColumn: 'span 3',
        maxHeight: '168px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderRadius: '8px',
        opacity: '0.9',
      },
    });
  });

  [
    'metric-auth-ovr',
    'metric-cov-hold',
    'metric-vnd-sla',
    'metric-res-delta',
    'metric-siu-subro',
    'metric-doc-err',
    'metric-fnol-lag',
    'metric-lit-hold',
  ].forEach((id) => {
    const metric = findNodeById(request.snapshot, id);
    addOverride(changes, metric, {
      style: {
        gridColumn: 'span 3',
        backgroundColor: '#ffffff',
        borderColor: '#bfdbfe',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
      },
    });
    addOverride(changes, findFirstDescendant(metric, (node) => node.tag === 'strong'), {
      style: {
        fontSize: '24px',
        color: '#0f172a',
      },
    });
  });

  [
    'reserve-trend-dashboard',
    'sla-heatmap-dashboard',
    'queue-aging-dashboard',
    'region-exposure-dashboard',
    'authority-funnel-dashboard',
    'claim-workload-table',
    'selected-file-record',
    'reserve-layer-stack',
    'vendor-sla-panel',
    'system-health-dashboard',
  ].forEach((id) => {
    addOverride(changes, findFirstDescendant(findNodeById(request.snapshot, id), (node) => node.tag === 'h2'), {
      style: {
        fontSize: '14px',
        color: '#0f172a',
      },
    });
  });

  let proposedConfig: MorphConfig = { ...request.config };
  for (const change of changes) {
    proposedConfig = mergeOverride(proposedConfig, change.path, change.override);
  }

  return {
    reply: 'I prepared a deterministic dashboard layout update: moved KPIs and core panels to the top, widened the reserve and workload sections, compacted low-priority modules, and kept every section visible. Review the changes on the page and accept or discard below.',
    proposedConfig,
    changes: summarizeConfigChanges(request.config, proposedConfig, request.snapshot),
    appliedTools: ['legacy_console_transform'],
  };
}

export async function runLayoutAgent(
  request: AgentMessageRequest,
): Promise<AgentMessageResponse> {
  const editScope = deriveEditScope(request.snapshot, request.selectionSubtree);
  const scopedRequest: AgentMessageRequest = { ...request, editScope };

  if (shouldHideSelected(scopedRequest)) {
    const proposedConfig = executeSetElementOverride(
      { ...scopedRequest.config },
      scopedRequest.snapshot,
      { path: scopedRequest.selectedPath!, hidden: true },
      editScope,
    );
    return {
      reply: 'I hid the selected section. Review the change on the page and accept or discard it below.',
      proposedConfig,
      changes: summarizeConfigChanges(scopedRequest.config, proposedConfig, scopedRequest.snapshot),
      appliedTools: ['hide_selected'],
    };
  }

  const legacyProposal = legacyConsoleTransform(scopedRequest);
  if (legacyProposal) return legacyProposal;

  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: getModelName(),
    tools: [LAYOUT_AGENT_TOOLS],
    systemInstruction: buildSystemPrompt(scopedRequest, {
      instructionsOverride: scopedRequest.instructionsOverride,
    }),
  });

  const history: Content[] = (scopedRequest.history ?? []).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });

  let workingConfig: MorphConfig = { ...scopedRequest.config };
  const appliedTools: string[] = [];
  const toolErrors: string[] = [];
  let response = await chat.sendMessage(formatUserMessage(scopedRequest));
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    const calls: FunctionCall[] = [];
    for (const candidate of response.response.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.functionCall) calls.push(part.functionCall);
      }
    }

    if (calls.length === 0) break;

    const functionResponses = [];

    for (const call of calls) {
      const name = call.name;
      const args = (call.args ?? {}) as Record<string, unknown>;
      try {
        const result = runTool(name, args, workingConfig, scopedRequest.snapshot, editScope);
        workingConfig = result.config;
        appliedTools.push(name);
        functionResponses.push({
          functionResponse: {
            name,
            response: { success: true },
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toolErrors.push(`${name}: ${message}`);
        functionResponses.push({
          functionResponse: {
            name,
            response: { success: false, error: message },
          },
        });
      }
    }

    response = await chat.sendMessage(functionResponses);
    rounds++;
  }

  const reply =
    response.response.text()?.trim() ||
    (appliedTools.length > 0
      ? 'Review the changes on the page and accept or discard below.'
      : 'I could not complete that request.');

  const proposedConfig =
    appliedTools.length > 0 ? workingConfig : undefined;
  const changes =
    proposedConfig !== undefined
      ? summarizeConfigChanges(scopedRequest.config, proposedConfig, scopedRequest.snapshot)
      : undefined;

  return {
    reply,
    proposedConfig,
    changes,
    appliedTools: appliedTools.length > 0 ? appliedTools : undefined,
    toolErrors: toolErrors.length > 0 ? toolErrors : undefined,
  };
}
