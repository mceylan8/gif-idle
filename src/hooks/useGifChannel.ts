import { useCallback, useEffect, useReducer, useRef } from 'react';
import { fetchRandomGif, preloadImage, type ChannelGif } from '../lib/giphy';

export const CHANNEL_INTERVAL_MS = 4500;
const RETRY_DELAY_MS = 1600;

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
  | { type: 'BUMP_PROGRESS' };

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
    case 'BUMP_PROGRESS':
      return { ...state, progressKey: state.progressKey + 1 };
    default:
      return state;
  }
}

export function useGifChannel() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const remainingMsRef = useRef(CHANNEL_INTERVAL_MS);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadNextRef = useRef<() => Promise<void>>(async () => undefined);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const loadNext = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    clearRetry();

    try {
      const nextGif = await fetchRandomGif();
      await preloadImage(nextGif.url);
      if (!mountedRef.current) return;
      remainingMsRef.current = CHANNEL_INTERVAL_MS;
      dispatch({ type: 'SHOW_GIF', gif: nextGif });
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Signal lost';
      dispatch({ type: 'SET_ERROR', message });
      retryTimerRef.current = setTimeout(() => {
        void loadNextRef.current();
      }, RETRY_DELAY_MS);
    } finally {
      fetchingRef.current = false;
    }
  }, [clearRetry]);

  useEffect(() => {
    loadNextRef.current = loadNext;
  }, [loadNext]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    void loadNext();
    return () => {
      mountedRef.current = false;
      clearRetry();
    };
  }, [loadNext, clearRetry]);

  // Auto-advance timer (pause-aware)
  useEffect(() => {
    if (state.paused || !state.gif || state.error) return;

    const startedAt = Date.now();
    const budget = remainingMsRef.current;

    const timerId = setTimeout(() => {
      remainingMsRef.current = CHANNEL_INTERVAL_MS;
      void loadNext();
    }, budget);

    return () => {
      clearTimeout(timerId);
      const elapsed = Date.now() - startedAt;
      remainingMsRef.current = Math.max(0, budget - elapsed);
    };
  }, [state.paused, state.gif, state.progressKey, state.error, loadNext]);

  const togglePause = useCallback(() => {
    dispatch({ type: 'TOGGLE_PAUSE' });
  }, []);

  const next = useCallback(() => {
    remainingMsRef.current = CHANNEL_INTERVAL_MS;
    dispatch({ type: 'BUMP_PROGRESS' });
    void loadNext();
  }, [loadNext]);

  // Keyboard: Space = pause, ArrowRight = next
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

  return {
    gif: state.gif,
    channel: state.channel,
    paused: state.paused,
    error: state.error,
    progressKey: state.progressKey,
    bootstrapping: state.bootstrapping,
    cycleMs: CHANNEL_INTERVAL_MS,
    togglePause,
    next,
  };
}
