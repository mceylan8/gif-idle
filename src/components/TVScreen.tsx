import { useEffect, useRef } from 'react';
import { claimPreloadedImage, type ChannelGif } from '../lib/klipy';
import styles from './TVScreen.module.css';

interface TVScreenProps {
  gif: ChannelGif | null;
  bootstrapping: boolean;
  error: string | null;
}

interface Layer {
  key: string;
  url: string;
  node: HTMLImageElement;
}

function styleFrame(node: HTMLImageElement, visible: boolean) {
  node.className = `${styles.frame} ${visible ? styles.frameVisible : styles.frameHidden}`;
}

export function TVScreen({ gif, bootstrapping, error }: TVScreenProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<Layer[]>([]);
  const visibleUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gif || gif.url === visibleUrlRef.current) return;

    const host = hostRef.current;
    if (!host) return;

    visibleUrlRef.current = gif.url;

    for (const layer of layersRef.current) {
      styleFrame(layer.node, false);
    }

    const claimed = claimPreloadedImage(gif.url);
    const node =
      claimed ??
      Object.assign(new Image(), {
        src: gif.url,
        alt: '',
        draggable: false,
      });

    styleFrame(node, true);
    if (!node.isConnected) {
      host.appendChild(node);
    }

    layersRef.current.push({
      key: `${gif.id}-${gif.url}`,
      url: gif.url,
      node,
    });

    // Keep at most the outgoing + incoming frame.
    while (layersRef.current.length > 2) {
      const oldest = layersRef.current.shift();
      oldest?.node.remove();
    }

    const outgoing = layersRef.current.find((layer) => layer.url !== gif.url);
    if (!outgoing) return;

    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName !== 'opacity') return;
      outgoing.node.removeEventListener('transitionend', onEnd);
      outgoing.node.remove();
      layersRef.current = layersRef.current.filter((layer) => layer !== outgoing);
    };

    outgoing.node.addEventListener('transitionend', onEnd);
    return () => outgoing.node.removeEventListener('transitionend', onEnd);
  }, [gif]);

  useEffect(() => {
    const host = hostRef.current;
    return () => {
      for (const layer of layersRef.current) {
        layer.node.remove();
      }
      layersRef.current = [];
      visibleUrlRef.current = null;
      host?.replaceChildren();
    };
  }, []);

  const showStatic = !gif || bootstrapping;

  return (
    <div className={styles.screen} aria-live="polite">
      <div ref={hostRef} className={styles.frameHost} />

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
