import { useState, useRef, useEffect, useCallback } from 'react';
import type { AgentChatMessage, AgentMessageRequest, ConfigChangeSummary, MorphConfig } from '../../types';
import { useMorphContext } from '../../config/ConfigContext';
import { fetchChatHistory, saveChatHistory } from '../../config/agentClient';
import { sendAgentMessageStream } from '../../config/agentStreamClient';
import {
  fromStoredMessages,
  newChatMessageId,
  serializeLiveHistory,
} from '../../agent/chatPersistence';
import { serializeLayoutSnapshot } from '../../agent/serializeLayoutSnapshot';
import { extractSelectionSubtree, selectionLabelFromPath } from '../../agent/selectionContext';
import { useEditorContainer } from '../EditorContainerContext';
import { clearChangeHighlights, setChangeHighlights } from '../changeHighlights';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { ChatEmptyState } from './ChatEmptyState';
import { TypingIndicator } from './TypingIndicator';

function newProposalId(): string {
  return `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AgentChat({
  suggestions,
  suggestionsRefreshing,
}: {
  suggestions: string[];
  suggestionsRefreshing: boolean;
}) {
  const {
    config,
    dispatch,
    selectedPath,
    userId,
    viewId,
    sessionId,
    routeId,
    apiUrl,
    saveConfig,
    onError,
  } = useMorphContext();
  const containerRef = useEditorContainer();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<AgentChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pendingProposalIndex = history.findIndex(
    (m) => m.proposal?.status === 'pending',
  );
  const pendingMessage =
    pendingProposalIndex >= 0 ? history[pendingProposalIndex] : null;
  const composerLocked = loading || approvalBusy || pendingProposalIndex >= 0;

  useEffect(() => {
    if (!apiUrl) return;
    let cancelled = false;
    void fetchChatHistory(apiUrl, userId, viewId, sessionId, routeId)
      .then((stored) => {
        if (!cancelled) {
          setHistory(fromStoredMessages(stored));
          setHistoryLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, userId, viewId, sessionId, routeId]);

  useEffect(() => {
    if (!apiUrl || !historyLoaded) return;
    const timer = window.setTimeout(() => {
      void saveChatHistory(
        apiUrl,
        userId,
        viewId,
        serializeLiveHistory(history),
        sessionId,
        routeId,
      ).catch(
        () => undefined,
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [apiUrl, history, historyLoaded, userId, viewId, sessionId, routeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading, streamingText]);

  useEffect(() => {
    if (pendingMessage?.proposal?.status === 'pending') {
      setChangeHighlights(pendingMessage.proposal.changes.map((c) => c.path));
    } else {
      clearChangeHighlights();
    }
    return () => clearChangeHighlights();
  }, [pendingMessage]);

  const discardPending = useCallback(
    (index: number) => {
      const msg = history[index];
      if (!msg?.proposal || msg.proposal.status !== 'pending') return;
      dispatch({ type: 'SET_CONFIG', payload: msg.proposal.beforeConfig });
      setHistory((prev) =>
        prev.map((m, i) =>
          i === index && m.proposal
            ? { ...m, proposal: { ...m.proposal, status: 'discarded' as const } }
            : m,
        ),
      );
    },
    [dispatch, history],
  );

  const acceptPending = useCallback(
    async (index: number) => {
      const msg = history[index];
      if (!msg?.proposal || msg.proposal.status !== 'pending') return;

      setApprovalBusy(true);
      setError(null);
      try {
        dispatch({ type: 'SET_CONFIG', payload: msg.proposal.proposedConfig });
        const ok = await saveConfig();
        if (!ok) {
          dispatch({ type: 'SET_CONFIG', payload: msg.proposal.beforeConfig });
          throw new Error('Failed to save changes');
        }
        setHistory((prev) =>
          prev.map((m, i) =>
            i === index && m.proposal
              ? { ...m, proposal: { ...m.proposal, status: 'accepted' as const } }
              : m,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
      } finally {
        setApprovalBusy(false);
      }
    },
    [dispatch, history, onError, saveConfig],
  );

  const runAgentRequest = useCallback(
    async (request: AgentMessageRequest, configBeforeRequest: MorphConfig) => {
      if (!apiUrl) return;

      let assistantContent = '';
      let proposed: MorphConfig | undefined;
      let changes: ConfigChangeSummary[] | undefined;

      await sendAgentMessageStream(apiUrl, request, {
        onTextDelta: (text) => {
          assistantContent += text;
          setStreamingText(assistantContent);
        },
        onProposal: (data) => {
          assistantContent = data.reply;
          proposed = data.proposedConfig as MorphConfig;
          changes = data.changes;
          setStreamingText(data.reply);
        },
        onError: (message) => {
          setError(message);
        },
      });

      setStreamingText('');
      setLoading(false);

      if (proposed && changes && changes.length > 0) {
        const proposedConfig = proposed;
        const changeList = changes;
        dispatch({ type: 'SET_CONFIG', payload: proposedConfig });
        setHistory((prev) => [
          ...prev,
          {
            id: newChatMessageId(),
            role: 'assistant',
            content: assistantContent,
            createdAt: new Date().toISOString(),
            proposal: {
              id: newProposalId(),
              status: 'pending',
              beforeConfig: configBeforeRequest,
              proposedConfig,
              changes: changeList,
            },
          },
        ]);
        return;
      }

      if (assistantContent) {
        setHistory((prev) => [
          ...prev,
          {
            id: newChatMessageId(),
            role: 'assistant',
            content: assistantContent,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    },
    [apiUrl, dispatch],
  );

  const submitMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || loading || approvalBusy) return;

      if (!apiUrl) {
        setError('Connect apiUrl on <Morph> to use the layout agent.');
        return;
      }

      const container = containerRef.current;
      if (!container) {
        setError('Layout container is not ready.');
        return;
      }

      if (pendingProposalIndex >= 0) discardPending(pendingProposalIndex);

      const configBeforeRequest = config;
      setInput('');
      setError(null);
      setLoading(true);
      setStreamingText('');

      const userMsg: AgentChatMessage = {
        id: newChatMessageId(),
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      };
      const nextHistory = [...history, userMsg];
      setHistory(nextHistory);

      try {
        const snapshot = serializeLayoutSnapshot(container, {
          viewId,
          config: configBeforeRequest,
          selectedPath,
        });
        const selectionSubtree =
          selectedPath != null
            ? extractSelectionSubtree(snapshot.nodes, selectedPath)
            : undefined;
        const selectionLabel =
          selectedPath != null ? selectionLabelFromPath(selectedPath) : undefined;

        await runAgentRequest(
          {
            userId,
            viewId,
            message,
            selectedPath: selectedPath ?? undefined,
            selectionLabel,
            selectionSubtree,
            snapshot,
            config: configBeforeRequest,
            history: nextHistory.slice(-20),
          },
          configBeforeRequest,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        onError?.(err instanceof Error ? err : new Error(msg));
        setLoading(false);
        setStreamingText('');
      }
    },
    [
      apiUrl,
      approvalBusy,
      config,
      containerRef,
      discardPending,
      history,
      loading,
      onError,
      pendingProposalIndex,
      runAgentRequest,
      selectedPath,
      userId,
      viewId,
    ],
  );

  if (!apiUrl) {
    return (
      <div data-morph-editor className="morph-chat-empty morph-chat-empty--muted">
        <p className="morph-chat-empty__desc">
          Connect <strong>apiUrl</strong> on Morph to enable the assistant.
        </p>
      </div>
    );
  }

  return (
    <div data-morph-editor className="morph-editor-agent-chat">
      <div className="morph-editor-agent-chat__messages">
        {history.length === 0 && !loading && (
          <ChatEmptyState
            suggestions={suggestions}
            refreshing={suggestionsRefreshing}
            disabled={composerLocked}
            onSuggestion={(s) => void submitMessage(s)}
          />
        )}
        {history.map((msg, i) => (
          <ChatMessage
            key={msg.id ?? i}
            index={i}
            message={msg}
            onAccept={() => void acceptPending(i)}
            onDiscard={() => discardPending(i)}
            approvalBusy={approvalBusy}
          />
        ))}
        {loading && streamingText && (
          <ChatMessage
            index={history.length}
            message={{ role: 'assistant', content: streamingText }}
            onAccept={() => undefined}
            onDiscard={() => undefined}
            approvalBusy={false}
            streaming
          />
        )}
        {loading && !streamingText && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="morph-editor-agent-chat__error" role="alert">
          {error}
        </div>
      )}

      {pendingMessage?.proposal && (
        <div className="morph-editor-agent-chat__sticky">
          <span className="morph-editor-agent-chat__sticky-label">
            {pendingMessage.proposal.changes.length} change
            {pendingMessage.proposal.changes.length === 1 ? '' : 's'} to review
          </span>
          <div className="morph-editor-agent-chat__sticky-actions">
            <button
              type="button"
              className="morph-editor-btn morph-editor-btn--sm morph-editor-btn--ghost"
              onClick={() => discardPending(pendingProposalIndex)}
              disabled={approvalBusy}
            >
              Discard
            </button>
            <button
              type="button"
              className="morph-editor-btn morph-editor-btn--sm morph-editor-btn--primary"
              onClick={() => void acceptPending(pendingProposalIndex)}
              disabled={approvalBusy}
            >
              Accept
            </button>
          </div>
        </div>
      )}

      <ChatComposer
        value={input}
        onChange={setInput}
        onSubmit={() => void submitMessage(input)}
        disabled={composerLocked}
        placeholder={
          pendingMessage ? 'Review pending changes first…' : 'Ask or describe a change…'
        }
      />
    </div>
  );
}
