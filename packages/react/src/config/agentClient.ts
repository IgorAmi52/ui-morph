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

function scopedUrl(apiUrl: string, path: string, sessionId?: string, routeId?: string): string {
  const base = `${apiUrl.replace(/\/$/, '')}${path}`;
  const params = new URLSearchParams();
  if (sessionId) params.set('sessionId', sessionId);
  if (routeId) params.set('routeId', routeId);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
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
  sessionId?: string,
  routeId?: string,
): Promise<StoredChatMessage[]> {
  const res = await fetch(
    scopedUrl(
      apiUrl,
      `/chat/${encodeURIComponent(userId)}/${encodeURIComponent(viewId)}`,
      sessionId,
      routeId,
    ),
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
  sessionId?: string,
  routeId?: string,
): Promise<StoredChatMessage[]> {
  const res = await fetch(
    scopedUrl(
      apiUrl,
      `/chat/${encodeURIComponent(userId)}/${encodeURIComponent(viewId)}`,
      sessionId,
      routeId,
    ),
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
