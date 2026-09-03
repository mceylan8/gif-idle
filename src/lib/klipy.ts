const KLIPY_BASE = 'https://api.klipy.com/api/v1';

export interface KlipyMediaFile {
  url: string;
  width: number;
  height: number;
  size?: number;
}

export interface KlipyFormats {
  gif?: KlipyMediaFile;
  webp?: KlipyMediaFile;
  jpg?: KlipyMediaFile;
  mp4?: KlipyMediaFile;
  webm?: KlipyMediaFile;
  png?: KlipyMediaFile;
}

/** Size buckets returned by the partner GIF API. */
export interface KlipySizeMap {
  hd?: KlipyFormats;
  md?: KlipyFormats;
  sm?: KlipyFormats;
  xs?: KlipyFormats;
}

/**
 * Single trending/search item.
 * Official payloads use `file`; some docs refer to the same map as `files`.
 */
export interface KlipyGifItem {
  id: number | string;
  slug: string;
  title: string;
  type?: string;
  tags?: string[];
  file?: KlipySizeMap;
  files?: KlipySizeMap;
}

export interface KlipyPageData {
  data: KlipyGifItem[];
  current_page: number;
  per_page: number;
  has_next: boolean;
}

export interface KlipyListResponse {
  result: boolean;
  data: KlipyPageData;
  errors?: { message?: string[] };
}

export interface ChannelGif {
  id: string;
  url: string;
  title: string;
}

export interface GifPage {
  items: ChannelGif[];
  currentPage: number;
  perPage: number;
  hasNext: boolean;
}

export interface FetchGifOptions {
  page?: number;
  perPage?: number;
  rating?: 'g' | 'pg' | 'pg-13' | 'r';
  locale?: string;
}

export interface FetchSearchOptions extends FetchGifOptions {
  q: string;
}

function getApiKey(): string {
  const key = import.meta.env.VITE_KLIPY_API_KEY;
  if (!key) {
    throw new Error(
      'Missing VITE_KLIPY_API_KEY. Copy .env.example to .env.local and add your Klipy key.',
    );
  }
  return key;
}

function sizeMapOf(item: KlipyGifItem): KlipySizeMap | undefined {
  return item.files ?? item.file;
}

/** Prefer mid-size GIF for faster loads; fall back through available buckets. */
export function pickBestUrl(item: KlipyGifItem): string | null {
  const sizes = sizeMapOf(item);
  if (!sizes) return null;

  const candidates = [
    sizes.md?.gif?.url,
    sizes.hd?.gif?.url,
    sizes.sm?.gif?.url,
    sizes.md?.webp?.url,
    sizes.hd?.webp?.url,
    sizes.xs?.gif?.url,
  ];

  return candidates.find((url): url is string => Boolean(url)) ?? null;
}

function toChannelGif(item: KlipyGifItem): ChannelGif | null {
  if (item.type === 'ad') return null;

  const url = pickBestUrl(item);
  if (!url) return null;

  const id = item.slug || String(item.id);
  const title =
    item.title?.trim() ||
    item.slug?.replace(/-/g, ' ') ||
    item.tags?.[0] ||
    'Untitled signal';

  return { id, url, title };
}

async function fetchGifList(
  path: 'trending' | 'search',
  params: URLSearchParams,
): Promise<GifPage> {
  const response = await fetch(
    `${KLIPY_BASE}/${getApiKey()}/gifs/${path}?${params.toString()}`,
  );

  let json: KlipyListResponse | null = null;
  try {
    json = (await response.json()) as KlipyListResponse;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const apiMessage = json?.errors?.message?.join(', ');
    throw new Error(apiMessage || `Klipy request failed (${response.status})`);
  }

  if (!json?.result || !json.data?.data) {
    const apiMessage = json?.errors?.message?.join(', ');
    throw new Error(apiMessage || 'Unexpected Klipy response');
  }

  const items = json.data.data
    .map(toChannelGif)
    .filter((gif): gif is ChannelGif => gif !== null);

  return {
    items,
    currentPage: json.data.current_page,
    perPage: json.data.per_page,
    hasNext: Boolean(json.data.has_next),
  };
}

function buildListParams(options: FetchGifOptions): URLSearchParams {
  const {
    page = 1,
    perPage = 50,
    rating = 'pg',
    locale = 'de_DE',
  } = options;

  const clampedPerPage = Math.min(50, Math.max(8, perPage));
  return new URLSearchParams({
    per_page: String(clampedPerPage),
    page: String(page),
    rating,
    locale,
  });
}

export async function fetchTrendingGifs(
  options: FetchGifOptions = {},
): Promise<GifPage> {
  return fetchGifList('trending', buildListParams(options));
}

export async function fetchSearchGifs(
  options: FetchSearchOptions,
): Promise<GifPage> {
  const query = options.q.trim();
  if (!query) {
    throw new Error('Search query is empty');
  }

  const params = buildListParams(options);
  params.set('q', query);
  return fetchGifList('search', params);
}

export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to preload image'));
    img.src = url;
  });
}
