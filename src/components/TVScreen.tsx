import { useState } from 'react';
import type { ChannelGif } from '../lib/klipy';
import styles from './TVScreen.module.css';

interface TVScreenProps {
  gif: ChannelGif | null;
  bootstrapping: boolean;
  error: string | null;
}

interface Layer {
  key: string;
  url: string;
  visible: boolean;
}

export function TVScreen({ gif, bootstrapping, error }: TVScreenProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const visibleUrl = layers.find((layer) => layer.visible)?.url ?? null;

  if (gif && gif.url !== visibleUrl) {
    setLayers((prev) =>
      [
        ...prev.map((layer) => ({ ...layer, visible: false })),
        { key: `${gif.id}-${gif.url}`, url: gif.url, visible: true },
      ].slice(-2),
    );
  }

  const showStatic = !gif || bootstrapping;

  return (
    <div className={styles.screen} aria-live="polite">
      {layers.map((layer) => (
        <img
          key={layer.key}
          className={`${styles.frame} ${layer.visible ? styles.frameVisible : styles.frameHidden}`}
          src={layer.url}
          alt=""
          draggable={false}
          onTransitionEnd={() => {
            if (layer.visible) return;
            setLayers((prev) => prev.filter((item) => item.key !== layer.key));
          }}
        />
      ))}

      {showStatic && (
        <div className={styles.static} aria-hidden="true">
          <div className={styles.staticNoise} />
          <span className={styles.staticLabel}>
            {error ? 'NO SIGNAL' : 'TUNING…'}
          </span>
        </div>
      )}

      <div className={styles.scanlines} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.glass} aria-hidden="true" />
    </div>
  );
}
