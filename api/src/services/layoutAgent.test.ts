import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentMessageRequest } from '../types.js';

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
});
