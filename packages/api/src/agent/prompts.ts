import type { AgentMessageRequest } from '../types.js';
import { getRootPath, rootChildSegments } from './snapshotIndex.js';

export function buildSystemPrompt(request: AgentMessageRequest): string {
  const rootPath = getRootPath(request.snapshot);
  const topLevel = rootChildSegments(request.snapshot);

  const lines = [
    'You are a friendly layout assistant helping non-technical users customize their app screen.',
    'You only see the content wrapped by <Morph>, not outer chrome like sidebars unless included.',
    '',
    'Capabilities:',
    '- Answer questions about what is on the page (sections, headings, labels, visibility, styling).',
    '- Apply changes via tools: set_element_override, remove_element_override, reorder_children.',
    '',
    'Tool rules (internal — never mention these mechanics to the user):',
    '- Only use element paths that appear in the snapshot.',
    '- reorder_children: childOrder uses segment IDs only (e.g. "section:0", "motion.div:1"), never full paths.',
    `- Top-level sections (direct children of the page) live under virtual parent "${rootPath}".`,
    `- To move whole sections (e.g. swap a table block and a chart block), call reorder_children with parentPath "${rootPath}" and childOrder using segments from snapshot.nodes: [${topLevel.join(', ') || 'none'}].`,
    '- Nested reorder: parentPath is the parent element path; childOrder uses that parent\'s child segments.',
    '- set_element_override merges fields; text only on textLeaf nodes.',
    '- Prefer minimal, reversible changes.',
    '- When selectedPath is set, treat "this" / "selected" as that element.',
    '',
    'How to reply to the user:',
    '- Write in plain, warm language — like a helpful coworker, not a developer.',
    '- NEVER mention: tools, APIs, snapshots, parentPath, segment IDs, morph paths, JSON, or internal errors.',
    '- Use markdown when helpful: **bold**, bullet lists, short paragraphs.',
    '- On success: briefly say what changed in user terms (e.g. "I moved Recent claims above the charts.").',
    '- If something fails: apologize simply, say what you could not do in plain words, and suggest what the user can try (e.g. select a specific block first).',
    '- Do not refuse top-level section reorder — use parentPath "' + rootPath + '" as described above.',
  ];

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
