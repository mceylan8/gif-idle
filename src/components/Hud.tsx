import { presets } from '../lib/presets';
import type { ZapMode } from '../hooks/useGifChannel';
import styles from './Hud.module.css';

interface HudProps {
  channel: number;
  title: string;
  error: string | null;
  paused: boolean;
  progressKey: number;
  cycleMs: number;
  mode: ZapMode;
  modeLabel: string;
  searchInput: string;
  activePresetQuery: string | null;
  lightsOut: boolean;
  onModeChange: (mode: ZapMode) => void;
  onSearchInputChange: (value: string) => void;
  onSelectPreset: (query: string, label: string) => void;
}

const MODE_OPTIONS: { id: ZapMode; label: string }[] = [
  { id: 'zap', label: 'Zap' },
  { id: 'search', label: 'Search' },
  { id: 'presets', label: 'Presets' },
];

export function Hud({
  channel,
  title,
  error,
  paused,
  progressKey,
  cycleMs,
  mode,
  modeLabel,
  searchInput,
  activePresetQuery,
  lightsOut,
  onModeChange,
  onSearchInputChange,
  onSelectPreset,
}: HudProps) {
  const channelLabel = String(Math.max(channel, 0)).padStart(2, '0');

  return (
    <div className={`${styles.hud} ${lightsOut ? styles.hudLightsOut : ''}`}>
      <div className={styles.topRow}>
        <div className={styles.topLeft}>
          <span className={styles.brand}>IDLE·TV</span>
          <div className={styles.modeSwitch} role="tablist" aria-label="Channel mode">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={mode === option.id}
                className={`${styles.modeButton} ${mode === option.id ? styles.modeButtonActive : ''}`}
                onClick={() => onModeChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.channelBlock}>
          <span className={styles.modeStatus} title={modeLabel}>
            {modeLabel}
          </span>
          <div className={styles.channelDigits}>
            <span className={styles.channelPrefix}>CH</span>
            <span className={styles.channelNumber} aria-label={`Channel ${channelLabel}`}>
              {channelLabel}
            </span>
          </div>
        </div>
      </div>

      {mode === 'search' && (
        <div className={styles.searchRow}>
          <label className={styles.searchLabel} htmlFor="gif-search">
            Q
          </label>
          <input
            id="gif-search"
            className={styles.searchInput}
            type="search"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder="type a signal… e.g. tmnt"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      {mode === 'presets' && (
        <div className={styles.presetRow} role="group" aria-label="Preset channels">
          {presets.map((preset) => {
            const active = activePresetQuery === preset.query;
            return (
              <button
                key={preset.query}
                type="button"
                className={`${styles.presetChip} ${active ? styles.presetChipActive : ''}`}
                aria-pressed={active}
                onClick={() => onSelectPreset(preset.query, preset.label)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

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
