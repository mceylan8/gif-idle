const GIPHY_RANDOM_URL = 'https://api.giphy.com/v1/gifs/random';

export interface GiphyImageRendition {
  url: string;
  width: string;
  height: string;
  size?: string;
  mp4?: string;
  webp?: string;
}

export interface GiphyGif {
  type: string;
  id: string;
  url: string;
  slug: string;
  title: string;
  rating: string;
  images: {
    original: GiphyImageRendition;
    downsized?: GiphyImageRendition;
    downsized_large?: GiphyImageRendition;
    fixed_height?: GiphyImageRendition;
    fixed_width?: GiphyImageRendition;
  };
}

export interface GiphyMeta {
  status: number;
  msg: string;
  response_id: string;
}

export interface GiphyRandomResponse {
  data: GiphyGif;
  meta: GiphyMeta;
}

export interface ChannelGif {
  id: string;
  url: string;
  title: string;
}

function getApiKey(): string {
  const key = import.meta.env.VITE_GIPHY_API_KEY;
  if (!key) {
    throw new Error(
      'Missing VITE_GIPHY_API_KEY. Copy .env.example to .env.local and add your Giphy key.',
    );
  }
  return key;
}

/** Prefer a mid-size rendition for faster loads; fall back to original. */
function pickBestUrl(gif: GiphyGif): string {
  return (
    gif.images.downsized_large?.url ||
    gif.images.downsized?.url ||
    gif.images.fixed_height?.url ||
    gif.images.original.url
  );
}

export async function fetchRandomGif(tag?: string): Promise<ChannelGif> {
  const params = new URLSearchParams({
    api_key: getApiKey(),
    rating: 'pg',
  });
  if (tag) params.set('tag', tag);

  const response = await fetch(`${GIPHY_RANDOM_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Giphy request failed (${response.status})`);
  }

  const json = (await response.json()) as GiphyRandomResponse;

  if (json.meta.status !== 200 || !json.data?.id) {
    throw new Error(json.meta.msg || 'Unexpected Giphy response');
  }

  const title = json.data.title?.trim() || json.data.slug?.replace(/-/g, ' ') || 'Untitled signal';

  return {
    id: json.data.id,
    url: pickBestUrl(json.data),
    title,
  };
}

export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to preload image'));
    img.src = url;
  });
}
