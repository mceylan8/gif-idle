import styles from './Controls.module.css';

interface ControlsProps {
  paused: boolean;
  lightsOut: boolean;
  onTogglePause: () => void;
  onNext: () => void;
  onToggleLightsOut: () => void;
}

export function Controls({
  paused,
  lightsOut,
  onTogglePause,
  onNext,
  onToggleLightsOut,
}: ControlsProps) {
  return (
    <div
      className={`${styles.controls} ${lightsOut ? styles.controlsLightsOut : ''}`}
      data-keep-idle
    >
      <button
        type="button"
        className={styles.button}
        onClick={onTogglePause}
        aria-label={paused ? 'Play' : 'Pause'}
      >
        <span className={styles.glyph} aria-hidden="true">
          {paused ? '▶' : 'Ⅱ'}
        </span>
        <span>{paused ? 'Play' : 'Pause'}</span>
        <kbd className={styles.kbd}>Space</kbd>
      </button>

      <button
        type="button"
        className={styles.button}
        onClick={onNext}
        aria-label="Next channel"
      >
        <span className={styles.glyph} aria-hidden="true">
          ▶▶
        </span>
        <span>Next</span>
        <kbd className={styles.kbd}>→</kbd>
      </button>

      <button
        type="button"
        className={`${styles.button} ${lightsOut ? styles.buttonIdleActive : ''}`}
        onClick={onToggleLightsOut}
        aria-label={lightsOut ? 'Exit idle mode' : 'Enter idle mode'}
        aria-pressed={lightsOut}
      >
        <span className={styles.glyph} aria-hidden="true">
          ◉
        </span>
        <span>{lightsOut ? 'Wake' : 'Idle'}</span>
        <kbd className={styles.kbd}>L</kbd>
      </button>
    </div>
  );
}
