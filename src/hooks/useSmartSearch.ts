import { useState, useEffect, useRef, useCallback } from 'react';
import { smartSearch, basicTextSearch } from '../services/smartSearchService';
import type { SmartSearchResult, SmartSearchCategory } from '../types';

interface UseSmartSearchOptions {
  scope?: SmartSearchCategory;
  debounceMs?: number;
}

interface UseSmartSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SmartSearchResult[];
  loading: boolean;
  clear: () => void;
}

export function useSmartSearch(options: UseSmartSearchOptions = {}): UseSmartSearchReturn {
  const { scope, debounceMs = 600 } = options;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SmartSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Short queries use faster basic search with shorter debounce
    const isShortQuery = trimmed.split(/\s+/).length <= 2;
    const delay = isShortQuery ? 200 : debounceMs;

    setLoading(true);
    const generation = ++abortRef.current;

    const timer = setTimeout(() => {
      const searchFn = isShortQuery
        ? basicTextSearch(trimmed, scope)
        : smartSearch(trimmed, scope);

      void searchFn.then((res) => {
        if (abortRef.current === generation) {
          setResults(res);
          setLoading(false);
        }
      }).catch(() => {
        if (abortRef.current === generation) {
          setResults([]);
          setLoading(false);
        }
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [query, scope, debounceMs]);

  const clear = useCallback((): void => {
    setQuery('');
    setResults([]);
    setLoading(false);
    abortRef.current++;
  }, []);

  return { query, setQuery, results, loading, clear };
}
