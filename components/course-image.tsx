import { courseImageAlt, courseImageSrcSet } from "@/lib/course-images";

type CourseImageProps = {
  /** The course image path from the catalogue data, e.g. /course-images/<slug>.jpg */
  src: string;
  /** Used when no written description exists for this image. */
  fallbackAlt: string;
  /** Pass "" to mark the image decorative (e.g. a thumbnail beside the course title). */
  alt?: string;
  /** The width the image is drawn at, so the browser downloads the smallest adequate file. */
  sizes: string;
  /** Eager, high-priority load for the main image at the top of a page. */
  priority?: boolean;
  lazy?: boolean;
};

/**
 * A course photo that loads a small WebP matched to its on-screen size and falls back to the original
 * file. Deliberately sets no width, height or aspect-ratio: each page's stylesheet already sizes and
 * crops these images (object-fit), and inline hints would override that.
 */
export function CourseImage({ src, fallbackAlt, alt, sizes, priority = false, lazy = false }: CourseImageProps) {
  const srcSet = courseImageSrcSet(src);
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt ?? courseImageAlt(src, fallbackAlt)}
      decoding="async"
      loading={lazy && !priority ? "lazy" : undefined}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
