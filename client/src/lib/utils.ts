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
  return `${num.toLocaleString("ar-EG")} ج.س`;
}

export function formatCategoryLabel(category: string) {
  return categoryLabels[category] ?? category;
}
