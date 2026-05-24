import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  getLayoutAgentInstructions,
  LAYOUT_AGENT_INSTRUCTIONS_VERSION,
} from './layoutInstructions.js';

describe('layoutInstructions', () => {
  it('pins version constant', () => {
    expect(LAYOUT_AGENT_INSTRUCTIONS_VERSION).toBe('v1');
  });

  it('includes root path and top-level segments', () => {
    const text = getLayoutAgentInstructions('morph', ['section:0', 'section:1']);
    expect(text).toContain('parentPath "morph"');
    expect(text).toContain('section:0, section:1');
  });

  it('has stable content hash unless instructions intentionally change', () => {
    const text = getLayoutAgentInstructions('morph', ['section:0']);
    const hash = createHash('sha256').update(text).digest('hex');
    expect(hash).toMatchSnapshot();
  });
});
