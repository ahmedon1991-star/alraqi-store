import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const categoryLabels: Record<string, string> = {
  spices: "التوابل والبهارات",
  grains: "الحبوب والدقيق",
  drinks: "المشروبات",
  sweets: "التمور والحلويات",
  natural: "منتجات طبيعية",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number) {
  const num = value ?? 0;
  return `${num.toLocaleString("ar-EG-u-nu-latn")} ج.س`;
}

/**
 * Ask Cloudinary for a copy sized for where the image is shown (and in the best format the
 * phone supports, e.g. WebP/AVIF). A 400px card image is ~4x smaller than the original.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function optimizedImage(url: string | null | undefined, width: number): string | undefined {
  if (!url) return undefined;
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || i === -1) return url;
  const rest = url.slice(i + marker.length);
  // Already transformed (first path segment has transformation params like "w_400" or "f_auto")
  if (/^[a-z]{1,3}_[^/]*\//.test(rest)) return url;
  return `${url.slice(0, i + marker.length)}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

export function formatCategoryLabel(category: string) {
  return categoryLabels[category] ?? category;
}
