import { Controls } from './components/Controls';
import { Hud } from './components/Hud';
import { TVScreen } from './components/TVScreen';
import { useGifChannel } from './hooks/useGifChannel';
import styles from './App.module.css';

export default function App() {
  const {
    gif,
    channel,
    paused,
    error,
    progressKey,
    bootstrapping,
    cycleMs,
    mode,
    searchInput,
    activePresetQuery,
    modeLabel,
    setMode,
    setSearchInput,
    selectPreset,
    togglePause,
    next,
  } = useGifChannel();

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <main className={styles.stage}>
        <header className={styles.header}>
          <h1 className={styles.logo}>Idle GIF Zapper</h1>
          <p className={styles.tagline}>Late-night static · random channels · no remote needed</p>
        </header>

        <section className={styles.tv} aria-label="Television">
          <div className={styles.bezel}>
            <div className={styles.screenWrap}>
              <TVScreen gif={gif} bootstrapping={bootstrapping} error={error} />
              <Hud
                channel={channel}
                title={gif?.title ?? ''}
                error={error}
                paused={paused}
                progressKey={progressKey}
                cycleMs={cycleMs}
                mode={mode}
                modeLabel={modeLabel}
                searchInput={searchInput}
                activePresetQuery={activePresetQuery}
                onModeChange={setMode}
                onSearchInputChange={setSearchInput}
                onSelectPreset={selectPreset}
              />
            </div>

            <div className={styles.speakerGrill} aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className={styles.grillSlot} />
              ))}
            </div>
          </div>

          <div className={styles.knobs} aria-hidden="true">
            <span className={styles.knob} />
            <span className={styles.knob} />
            <span className={`${styles.knob} ${styles.knobAmber}`} />
          </div>
        </section>

        <Controls paused={paused} onTogglePause={togglePause} onNext={next} />

        <p className={styles.hint}>
          Space pauses · Right arrow zaps next · Switch Zap / Search / Presets on the screen
        </p>
      </main>
    </div>
  );
}
