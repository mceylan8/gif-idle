export interface Preset {
  /** Chip label shown in the HUD */
  label: string;
  /** Query sent to Klipy search */
  query: string;
}

/**
 * Data-driven preset chips for Presets mode.
 * Append objects here to add more channels — no other code changes needed.
 */
export const presets: Preset[] = [
  { label: 'Anime', query: 'anime' },
  { label: 'Gaming', query: 'gaming' },
  { label: 'Comics', query: 'comics' },
  { label: 'Cartoons', query: 'cartoons' },
];
