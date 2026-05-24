import type { ConfigChangeSummary, MorphConfig } from '../types.js';

export type AgentStreamEvent =
  | { type: 'text_delta'; data: { text: string } }
  | { type: 'tool_start'; data: { name: string; index: number; total: number } }
  | { type: 'tool_done'; data: { name: string; success: boolean; error?: string } }
  | { type: 'proposal'; data: { reply: string; proposedConfig: MorphConfig; changes: ConfigChangeSummary[] } }
  | { type: 'error'; data: { message: string } }
  | { type: 'done'; data: Record<string, never> };

export function formatSseEvent(event: AgentStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function chunkText(text: string, size = 24): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
