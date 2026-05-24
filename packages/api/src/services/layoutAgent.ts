import { GoogleGenerativeAI, type Content, type FunctionCall } from '@google/generative-ai';
import type { AgentMessageRequest, AgentMessageResponse, MorphConfig } from '../types.js';
import { buildSystemPrompt } from '../agent/prompts.js';
import { LAYOUT_AGENT_TOOLS } from '../agent/tools.js';
import {
  executeRemoveElementOverride,
  executeReorderChildren,
  executeSetElementOverride,
} from '../agent/toolExecutors.js';
import { summarizeConfigChanges } from '../agent/configDiff.js';
import { ValidationError } from './validationService.js';

const MAX_TOOL_ROUNDS = 8;

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
        }),
      };
    case 'remove_element_override':
      return {
        label: name,
        config: executeRemoveElementOverride(config, snapshot, args as { path: string }),
      };
    case 'reorder_children':
      return {
        label: name,
        config: executeReorderChildren(config, snapshot, args as {
          parentPath: string;
          childOrder: string[];
        }),
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

export async function runLayoutAgent(
  request: AgentMessageRequest,
): Promise<AgentMessageResponse> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: getModelName(),
    tools: [LAYOUT_AGENT_TOOLS],
    systemInstruction: buildSystemPrompt(request),
  });

  const history: Content[] = (request.history ?? []).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });

  let workingConfig: MorphConfig = { ...request.config };
  const appliedTools: string[] = [];
  let response = await chat.sendMessage(formatUserMessage(request));
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
        const result = runTool(name, args, workingConfig, request.snapshot);
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
      ? summarizeConfigChanges(request.config, proposedConfig, request.snapshot)
      : undefined;

  return {
    reply,
    proposedConfig,
    changes,
    appliedTools: appliedTools.length > 0 ? appliedTools : undefined,
  };
}
