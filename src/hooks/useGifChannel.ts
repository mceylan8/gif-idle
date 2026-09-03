import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { resolveAlias } from '../lib/aliases';
import {
  fetchSearchGifs,
  fetchTrendingGifs,
  preloadImage,
  type ChannelGif,
} from '../lib/klipy';
import { presets } from '../lib/presets';

export const CHANNEL_INTERVAL_MS = 90_000;
export const SEARCH_ZAP_INTERVAL_MS = 8_000;
const RETRY_DELAY_MS = 1600;
const SEARCH_DEBOUNCE_MS = 500;
const PER_PAGE = 50;
const REFILL_THRESHOLD = 10;
const RECENT_LIMIT = 16;

export type ZapMode = 'zap' | 'search' | 'presets';

type FeedSource =
  | { type: 'trending' }
  | { type: 'search'; query: string; label: string };

interface ChannelState {
  gif: ChannelGif | null;
  channel: number;
  paused: boolean;
  error: string | null;
  progressKey: number;
  bootstrapping: boolean;
}

type Action =
  | { type: 'SHOW_GIF'; gif: ChannelGif }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'SOURCE_RESET' };

const initialState: ChannelState = {
  gif: null,
  channel: 0,
  paused: false,
  error: null,
  progressKey: 0,
  bootstrapping: true,
};

function reducer(state: ChannelState, action: Action): ChannelState {
  switch (action.type) {
    case 'SHOW_GIF':
      return {
        ...state,
        gif: action.gif,
        channel: state.channel + 1,
        error: null,
        progressKey: state.progressKey + 1,
        bootstrapping: false,
      };
    case 'SET_ERROR':
      return { ...state, error: action.message, bootstrapping: false };
    case 'TOGGLE_PAUSE':
      return { ...state, paused: !state.paused };
    case 'SOURCE_RESET':
      return {
        ...state,
        channel: 0,
        error: null,
        paused: false,
        progressKey: state.progressKey + 1,
        bootstrapping: state.gif === null,
      };
    default:
      return state;
  }
}

function pickRandomId(ids: string[]): string | null {
  if (ids.length === 0) return null;
  const index = Math.floor(Math.random() * ids.length);
  return ids[index] ?? null;
}

function sourceKeyOf(source: FeedSource): string {
  return source.type === 'trending' ? 'trending' : `search:${source.query.toLowerCase()}`;
}

function intervalForSource(source: FeedSource): number {
  return source.type === 'search' ? SEARCH_ZAP_INTERVAL_MS : CHANNEL_INTERVAL_MS;
}

export function useGifChannel() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [mode, setModeState] = useState<ZapMode>('zap');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activePresetQuery, setActivePresetQuery] = useState<string | null>(null);
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>(null);

  const advancingRef = useRef(false);
  const prefetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const pausedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<() => Promise<void>>(async () => undefined);
  const generationRef = useRef(0);
  const sourceRef = useRef<FeedSource>({ type: 'trending' });

  const poolRef = useRef<Map<string, ChannelGif>>(new Map());
  const unusedIdsRef = useRef<Set<string>>(new Set());
  const recentIdsRef = useRef<string[]>([]);
  const nextPageRef = useRef(1);
  const hasNextRef = useRef(true);

  // Debounce search input
  useEffect(() => {
    if (mode !== 'search') return;
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, mode]);

  const feedSource = useMemo<FeedSource>(() => {
    if (mode === 'search') {
      const resolved = resolveAlias(debouncedSearch);
      if (!resolved) return { type: 'trending' };
      return { type: 'search', query: resolved, label: debouncedSearch };
    }

    if (mode === 'presets' && activePresetQuery) {
      return {
        type: 'search',
        query: activePresetQuery,
        label: activePresetLabel ?? activePresetQuery,
      };
    }

    return { type: 'trending' };
  }, [mode, debouncedSearch, activePresetQuery, activePresetLabel]);

  const feedKey = sourceKeyOf(feedSource);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearSchedule = useCallback(() => {
    if (scheduleTimerRef.current !== null) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearSchedule();
    if (!mountedRef.current || pausedRef.current) return;

    const wait = intervalForSource(sourceRef.current);
    scheduleTimerRef.current = setTimeout(() => {
      scheduleTimerRef.current = null;
      void advanceRef.current();
    }, wait);
  }, [clearSchedule]);

  const resetPool = useCallback(() => {
    poolRef.current.clear();
    unusedIdsRef.current.clear();
    recentIdsRef.current = [];
    nextPageRef.current = 1;
    hasNextRef.current = true;
    prefetchingRef.current = false;
    advancingRef.current = false;
  }, []);

  const rememberRecent = useCallback((id: string) => {
    const recent = recentIdsRef.current.filter((entry) => entry !== id);
    recent.push(id);
    if (recent.length > RECENT_LIMIT) {
      recent.splice(0, recent.length - RECENT_LIMIT);
    }
    recentIdsRef.current = recent;
  }, []);

  const mergePage = useCallback((items: ChannelGif[]) => {
    for (const item of items) {
      if (poolRef.current.has(item.id)) continue;
      poolRef.current.set(item.id, item);
      unusedIdsRef.current.add(item.id);
    }
  }, []);

  const refillUnusedFromPool = useCallback(() => {
    const recent = new Set(recentIdsRef.current);
    for (const id of poolRef.current.keys()) {
      if (!recent.has(id)) {
        unusedIdsRef.current.add(id);
      }
    }
  }, []);

  const fetchPage = useCallback(
    async (page: number, source: FeedSource) => {
      // Explicit endpoint switch: search query → /gifs/search, otherwise /gifs/trending (never trending+q).
      const result =
        source.type === 'search'
          ? await fetchSearchGifs({
              q: source.query,
              page,
              perPage: PER_PAGE,
            })
          : await fetchTrendingGifs({
              page,
              perPage: PER_PAGE,
            });

      mergePage(result.items);
      hasNextRef.current = result.hasNext;
      nextPageRef.current = result.currentPage + 1;
      return result;
    },
    [mergePage],
  );

  const prefetchIfNeeded = useCallback(
    async (source: FeedSource) => {
      if (prefetchingRef.current || !mountedRef.current) return;
      if (unusedIdsRef.current.size >= REFILL_THRESHOLD) return;

      const generation = generationRef.current;
      prefetchingRef.current = true;
      try {
        if (hasNextRef.current) {
          await fetchPage(nextPageRef.current, source);
        } else if (poolRef.current.size > 0) {
          refillUnusedFromPool();
          if (unusedIdsRef.current.size < REFILL_THRESHOLD) {
            hasNextRef.current = true;
            nextPageRef.current = 1;
            await fetchPage(1, source);
          }
        }
      } catch {
        // Background refill failures are non-fatal.
      } finally {
        if (generation === generationRef.current) {
          prefetchingRef.current = false;
        }
      }
    },
    [fetchPage, refillUnusedFromPool],
  );

  const ensurePoolReady = useCallback(
    async (source: FeedSource) => {
      if (unusedIdsRef.current.size > 0) {
        void prefetchIfNeeded(source);
        return;
      }

      if (poolRef.current.size === 0) {
        await fetchPage(1, source);
      } else {
        refillUnusedFromPool();
        if (unusedIdsRef.current.size === 0) {
          hasNextRef.current = true;
          nextPageRef.current = 1;
          await fetchPage(1, source);
        }
      }

      if (unusedIdsRef.current.size === 0) {
        throw new Error('Klipy returned no usable GIFs');
      }

      void prefetchIfNeeded(source);
    },
    [fetchPage, prefetchIfNeeded, refillUnusedFromPool],
  );

  const drawFromPool = useCallback((): ChannelGif => {
    const recent = new Set(recentIdsRef.current);
    let candidates = [...unusedIdsRef.current].filter((id) => !recent.has(id));

    if (candidates.length === 0) {
      candidates = [...unusedIdsRef.current];
    }

    if (candidates.length === 0) {
      refillUnusedFromPool();
      candidates = [...unusedIdsRef.current].filter((id) => !recent.has(id));
      if (candidates.length === 0) {
        candidates = [...unusedIdsRef.current];
      }
    }

    const id = pickRandomId(candidates);
    if (!id) {
      throw new Error('Channel pool exhausted');
    }

    unusedIdsRef.current.delete(id);
    rememberRecent(id);

    const gif = poolRef.current.get(id);
    if (!gif) {
      throw new Error('Missing GIF in pool');
    }

    return gif;
  }, [refillUnusedFromPool, rememberRecent]);

  const advance = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    clearRetry();
    const generation = generationRef.current;
    const source = sourceRef.current;

    try {
      await ensurePoolReady(source);
      if (!mountedRef.current || generation !== generationRef.current) return;

      const nextGif = drawFromPool();
      try {
        await preloadImage(nextGif.url);
      } catch {
        // Still switch — a broken file should not freeze the channel.
      }
      if (!mountedRef.current || generation !== generationRef.current) return;

      dispatch({ type: 'SHOW_GIF', gif: nextGif });
      scheduleNext();
      void prefetchIfNeeded(source);
    } catch (err) {
      if (!mountedRef.current || generation !== generationRef.current) return;
      const message = err instanceof Error ? err.message : 'Signal lost';
      dispatch({ type: 'SET_ERROR', message });
      retryTimerRef.current = setTimeout(() => {
        void advanceRef.current();
      }, RETRY_DELAY_MS);
    } finally {
      advancingRef.current = false;
    }
  }, [clearRetry, drawFromPool, ensurePoolReady, prefetchIfNeeded, scheduleNext]);

  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  // Retune when feed source changes (mode / query / preset)
  useEffect(() => {
    mountedRef.current = true;
    sourceRef.current = feedSource;
    generationRef.current += 1;
    pausedRef.current = false;
    clearRetry();
    clearSchedule();
    resetPool();
    dispatch({ type: 'SOURCE_RESET' });
    void advanceRef.current();

    return () => {
      clearRetry();
      clearSchedule();
    };
  }, [feedKey, feedSource, clearRetry, clearSchedule, resetPool]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearRetry();
      clearSchedule();
    };
  }, [clearRetry, clearSchedule]);

  const togglePause = useCallback(() => {
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    dispatch({ type: 'TOGGLE_PAUSE' });
    if (nextPaused) {
      clearSchedule();
    } else {
      scheduleNext();
    }
  }, [clearSchedule, scheduleNext]);

  const next = useCallback(() => {
    clearSchedule();
    void advance();
  }, [advance, clearSchedule]);

  const setMode = useCallback((nextMode: ZapMode) => {
    setModeState((current) => {
      if (current === nextMode) return current;

      if (nextMode === 'zap') {
        setActivePresetQuery(null);
        setActivePresetLabel(null);
      }

      if (nextMode === 'search') {
        setActivePresetQuery(null);
        setActivePresetLabel(null);
        setDebouncedSearch(searchInput.trim());
      }

      if (nextMode === 'presets') {
        const first = presets[0];
        if (first) {
          setActivePresetQuery(first.query);
          setActivePresetLabel(first.label);
        }
      }

      return nextMode;
    });
  }, [searchInput]);

  const selectPreset = useCallback((query: string, label: string) => {
    setModeState('presets');
    setActivePresetQuery(query);
    setActivePresetLabel(label);
  }, []);

  // Keyboard: Space = pause, ArrowRight = next (ignored while typing)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        togglePause();
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        next();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePause, next]);

  const modeLabel =
    feedSource.type === 'trending'
      ? 'ZAP'
      : mode === 'presets'
        ? `PRESET · ${feedSource.label}`
        : `SEARCH · ${feedSource.label}`;

  return {
    gif: state.gif,
    channel: state.channel,
    paused: state.paused,
    error: state.error,
    progressKey: state.progressKey,
    bootstrapping: state.bootstrapping,
    cycleMs: intervalForSource(feedSource),
    mode,
    searchInput,
    activePresetQuery,
    modeLabel,
    setMode,
    setSearchInput,
    selectPreset,
    togglePause,
    next,
  };
}
