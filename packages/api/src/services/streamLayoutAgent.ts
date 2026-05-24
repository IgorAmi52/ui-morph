import type { AgentMessageRequest } from '../types.js';
import { runLayoutAgent } from '../services/layoutAgent.js';
import type { AgentStreamEvent } from '../agent/agentEvents.js';
import { chunkText } from '../agent/agentEvents.js';

export async function* streamLayoutAgent(
  request: AgentMessageRequest,
): AsyncGenerator<AgentStreamEvent> {
  try {
    const result = await runLayoutAgent(request);

    if (result.appliedTools?.length) {
      for (const name of result.appliedTools) {
        yield {
          type: 'tool_done',
          data: { name, success: true },
        };
      }
    }

    for (const part of chunkText(result.reply)) {
      yield { type: 'text_delta', data: { text: part } };
    }

    if (result.proposedConfig && result.changes?.length) {
      yield {
        type: 'proposal',
        data: {
          reply: result.reply,
          proposedConfig: result.proposedConfig,
          changes: result.changes,
        },
      };
    }

    yield { type: 'done', data: {} };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    yield { type: 'error', data: { message } };
    yield { type: 'done', data: {} };
  }
}
