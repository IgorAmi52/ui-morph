import { useEffect, useState, useRef } from 'react';
import type { RefObject } from 'react';
import { serializeLayoutSnapshot } from '../agent/serializeLayoutSnapshot';
import { compactLayoutSnapshot } from '../agent/compactLayoutSnapshot';
import { deriveLayoutSuggestions } from '../agent/deriveLayoutSuggestions';
import { fetchAgentSuggestions } from '../config/agentClient';

interface UseLayoutSuggestionsOptions {
  enabled: boolean;
  apiUrl?: string;
  containerRef: RefObject<HTMLDivElement | null>;
  userId: string;
  viewId: string;
}

export function useLayoutSuggestions({
  enabled,
  apiUrl,
  containerRef,
  userId,
  viewId,
}: UseLayoutSuggestionsOptions): {
  suggestions: string[];
  suggestionsRefreshing: boolean;
} {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsRefreshing, setSuggestionsRefreshing] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !apiUrl) {
      loadedRef.current = false;
      setSuggestions([]);
      setSuggestionsRefreshing(false);
      return;
    }

    if (loadedRef.current) return;

    let cancelled = false;
    let rafId = 0;

    const load = () => {
      const container = containerRef.current;
      if (!container) {
        rafId = requestAnimationFrame(load);
        return;
      }

      loadedRef.current = true;

      const snapshot = serializeLayoutSnapshot(container, {
        viewId,
        config: {},
        selectedPath: undefined,
      });
      const fallback = deriveLayoutSuggestions(snapshot, null);

      if (!cancelled) {
        setSuggestions(fallback);
        setSuggestionsRefreshing(true);
      }

      void fetchAgentSuggestions(apiUrl, {
        userId,
        viewId,
        snapshot: compactLayoutSnapshot(snapshot),
        config: {},
      })
        .then((res) => {
          if (!cancelled && res.suggestions.length > 0) {
            setSuggestions(res.suggestions);
          }
        })
        .catch(() => {
          /* keep fallback */
        })
        .finally(() => {
          if (!cancelled) setSuggestionsRefreshing(false);
        });
    };

    load();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [apiUrl, containerRef, enabled, userId, viewId]);

  return { suggestions, suggestionsRefreshing };
}
