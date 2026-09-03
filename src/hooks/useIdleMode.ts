import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_AFTER_MS = 12_000;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
}

function isKeepIdleTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('[data-keep-idle]'));
}

export function useIdleMode() {
  const [lightsOut, setLightsOut] = useState(false);
  const lightsOutRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lightsOutRef.current = lightsOut;
  }, [lightsOut]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const arm = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setLightsOut(true);
    }, IDLE_AFTER_MS);
  }, [clearTimer]);

  const wake = useCallback(() => {
    setLightsOut(false);
    arm();
  }, [arm]);

  const toggle = useCallback(() => {
    setLightsOut((current) => {
      const next = !current;
      if (!next) arm();
      else clearTimer();
      return next;
    });
  }, [arm, clearTimer]);

  useEffect(() => {
    arm();

    const onPointerMove = (event: PointerEvent) => {
      if (isTypingTarget(event.target)) return;
      if (lightsOutRef.current) return;
      arm();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (isKeepIdleTarget(event.target)) return;
      if (isTypingTarget(event.target)) {
        setLightsOut(false);
        arm();
        return;
      }
      if (lightsOutRef.current) {
        wake();
        return;
      }
      arm();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && lightsOutRef.current) {
        event.preventDefault();
        wake();
        return;
      }
      if (event.code === 'KeyL' && !isTypingTarget(event.target)) {
        event.preventDefault();
        toggle();
        return;
      }
      if (isTypingTarget(event.target)) {
        setLightsOut(false);
        clearTimer();
        return;
      }
      if (lightsOutRef.current) return;
      arm();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimer();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [arm, clearTimer, toggle, wake]);

  return { lightsOut, toggle, wake };
}
