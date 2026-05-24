import type {
  AgentMessageRequest,
  AgentMessageResponse,
  AgentSuggestionsRequest,
  AgentSuggestionsResponse,
  ChatHistoryResponse,
  StoredChatMessage,
} from '../types';

async function parseAgentError(res: Response, fallback: string): Promise<never> {
  const body = await res.text().catch(() => '');
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed.error) throw new Error(parsed.error);
  } catch (e) {
    if (e instanceof Error && e.message !== body) throw e;
  }
  throw new Error(body || fallback);
}

export async function fetchAgentSuggestions(
  apiUrl: string,
  request: AgentSuggestionsRequest,
): Promise<AgentSuggestionsResponse> {
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/agent/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    await parseAgentError(res, `Suggestions request failed: ${res.status}`);
  }

  return res.json() as Promise<AgentSuggestionsResponse>;
}

export async function sendAgentMessage(
  apiUrl: string,
  request: AgentMessageRequest,
): Promise<AgentMessageResponse> {
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/agent/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    await parseAgentError(res, `Agent request failed: ${res.status}`);
  }

  return res.json() as Promise<AgentMessageResponse>;
}

export async function fetchChatHistory(
  apiUrl: string,
  userId: string,
  viewId: string,
): Promise<StoredChatMessage[]> {
  const res = await fetch(
    `${apiUrl.replace(/\/$/, '')}/chat/${encodeURIComponent(userId)}/${encodeURIComponent(viewId)}`,
  );
  if (!res.ok) {
    await parseAgentError(res, `Chat history fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as ChatHistoryResponse;
  return data.messages ?? [];
}

export async function saveChatHistory(
  apiUrl: string,
  userId: string,
  viewId: string,
  messages: StoredChatMessage[],
): Promise<StoredChatMessage[]> {
  const res = await fetch(
    `${apiUrl.replace(/\/$/, '')}/chat/${encodeURIComponent(userId)}/${encodeURIComponent(viewId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    },
  );
  if (!res.ok) {
    await parseAgentError(res, `Chat history save failed: ${res.status}`);
  }
  const data = (await res.json()) as ChatHistoryResponse;
  return data.messages ?? [];
}
