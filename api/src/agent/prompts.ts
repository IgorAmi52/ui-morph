import type { AgentMessageRequest } from '../types.js';
import { getLayoutAgentInstructions } from './layoutInstructions.js';
import { getRootPath, rootChildSegments } from './snapshotIndex.js';

export interface BuildSystemPromptOptions {
  /** Dev/eval only: replace static instructions (GEPA candidates). */
  instructionsOverride?: string;
}

export function buildSystemPrompt(
  request: AgentMessageRequest,
  options?: BuildSystemPromptOptions,
): string {
  const rootPath = getRootPath(request.snapshot);
  const topLevel = rootChildSegments(request.snapshot);

  const staticInstructions =
    options?.instructionsOverride ??
    getLayoutAgentInstructions(rootPath, topLevel);

  const lines = [staticInstructions];

  if (request.selectedPath) {
    lines.push('', `Selected element path (internal): ${request.selectedPath}`);
    if (request.selectionLabel) {
      lines.push(`Selected element label: ${request.selectionLabel}`);
    }
    if (request.selectionSubtree) {
      lines.push(
        '',
        'Selection subtree JSON (preferred target for "this" / "selected" edits):',
        JSON.stringify(request.selectionSubtree, null, 2),
      );
    }
  }

  if (request.editScope) {
    lines.push(
      '',
      'Current edit scope JSON (hard limit for tools):',
      JSON.stringify(request.editScope, null, 2),
    );
  }

  if (request.snapshot.truncated) {
    lines.push(
      '',
      `Note: snapshot truncated at ${request.snapshot.nodeCount} nodes; some elements may be missing.`,
    );
  }

  lines.push(
    '',
    'Current overrides JSON:',
    JSON.stringify(request.config, null, 2),
    '',
    'Layout snapshot JSON:',
    JSON.stringify(request.snapshot, null, 2),
  );

  return lines.join('\n');
}
