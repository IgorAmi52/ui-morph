import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { MorphConfig } from '../types';
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
  config: MorphConfig;
  selectedPath: string | null;
}

export function useLayoutSuggestions({
  enabled,
  apiUrl,
  containerRef,
  userId,
  viewId,
  config,
  selectedPath,
}: UseLayoutSuggestionsOptions): {
  suggestions: string[];
  suggestionsRefreshing: boolean;
} {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsRefreshing, setSuggestionsRefreshing] = useState(false);

  useEffect(() => {
    if (!enabled || !apiUrl) {
      setSuggestions([]);
      setSuggestionsRefreshing(false);
      return;
    }

    let cancelled = false;
    let rafId = 0;

    const load = () => {
      const container = containerRef.current;
      if (!container) {
        rafId = requestAnimationFrame(load);
        return;
      }

      const snapshot = serializeLayoutSnapshot(container, {
        viewId,
        config,
        selectedPath,
      });
      const fallback = deriveLayoutSuggestions(snapshot, selectedPath);

      if (!cancelled) {
        setSuggestions(fallback);
        setSuggestionsRefreshing(true);
      }

      void fetchAgentSuggestions(apiUrl, {
        userId,
        viewId,
        selectedPath: selectedPath ?? undefined,
        snapshot: compactLayoutSnapshot(snapshot),
        config,
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
  }, [apiUrl, config, containerRef, enabled, selectedPath, userId, viewId]);

  return { suggestions, suggestionsRefreshing };
}
