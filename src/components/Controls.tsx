import styles from './Controls.module.css';

interface ControlsProps {
  paused: boolean;
  onTogglePause: () => void;
  onNext: () => void;
}

export function Controls({ paused, onTogglePause, onNext }: ControlsProps) {
  return (
    <div className={styles.controls}>
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
    </div>
  );
}
