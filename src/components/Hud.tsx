import styles from './Hud.module.css';

interface HudProps {
  channel: number;
  title: string;
  error: string | null;
  paused: boolean;
  progressKey: number;
  cycleMs: number;
}

export function Hud({
  channel,
  title,
  error,
  paused,
  progressKey,
  cycleMs,
}: HudProps) {
  const channelLabel = String(Math.max(channel, 0)).padStart(2, '0');

  return (
    <div className={styles.hud}>
      <div className={styles.topRow}>
        <span className={styles.brand}>IDLE·TV</span>
        <div className={styles.channelBlock}>
          <span className={styles.channelPrefix}>CH</span>
          <span className={styles.channelNumber} aria-label={`Channel ${channelLabel}`}>
            {channelLabel}
          </span>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <p className={styles.title} title={title}>
          {error ? `ERR · ${error}` : title || 'Awaiting signal'}
        </p>
        {paused && <span className={styles.pauseBadge}>II PAUSE</span>}
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <div
          key={progressKey}
          className={styles.progressBar}
          style={{
            animationDuration: `${cycleMs}ms`,
            animationPlayState: paused || Boolean(error) ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}
