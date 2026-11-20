// Site photos: resized WebP copies of Wikimedia Commons originals (credits in SiteFooter.tsx).
import type { PhotoSource } from '@/components/marketing/Photo';

export const PHOTOS = {
  maizeBeans: { name: 'maize-beans', widths: [640, 1024, 1600], width: 1600, height: 1064 },
  farmers: { name: 'farmers', widths: [640, 1024, 1600], width: 1600, height: 1067 },
  hoeing: { name: 'hoeing', widths: [640, 1024, 1600], width: 1600, height: 1063 },
  weeding: { name: 'weeding', widths: [640, 1024, 1600], width: 1600, height: 1063 },
} as const satisfies Record<string, PhotoSource>;
