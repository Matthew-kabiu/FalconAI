// Responsive, self-hosted site photo (WebP in public/images/site/<name>-<width>.webp).
// Width and height are set so the browser reserves the space before the image loads
// (no layout shift). Photos below the first screen load lazily; the hero loads first.

export interface PhotoSource {
  /** File stem, e.g. "maize-beans" → /images/site/maize-beans-640.webp. */
  name: string;
  /** Available widths, smallest first. */
  widths: readonly number[];
  /** Intrinsic aspect, width / height of the largest file. */
  width: number;
  height: number;
}

interface PhotoProps {
  source: PhotoSource;
  /** Already-translated description of what the photo shows. */
  alt: string;
  /** CSS `sizes` hint, e.g. "(min-width: 48rem) 50vw, 100vw". */
  sizes: string;
  /** The hero photo: load at once and with high priority. */
  priority?: boolean;
  className?: string;
}

const src = (name: string, width: number) => `/images/site/${name}-${width}.webp`;

export function Photo({ source, alt, sizes, priority = false, className = '' }: PhotoProps) {
  const largest = source.widths[source.widths.length - 1];
  return (
    <img
      src={src(source.name, largest)}
      srcSet={source.widths.map((w) => `${src(source.name, w)} ${w}w`).join(', ')}
      sizes={sizes}
      width={source.width}
      height={source.height}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      className={['block h-auto w-full bg-surface-hover object-cover', className].join(' ')}
    />
  );
}

