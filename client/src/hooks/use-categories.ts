import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

type Category = { id: string; name: string; icon: string | null };

/** Categories list — shares the same cache entry as the home and shop pages. */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories"),
    staleTime: 10 * 60 * 1000,
  });
}

/** Arabic display name for a category id (falls back to the id while loading). */
export function useCategoryName(categoryId: string) {
  const { data } = useCategories();
  return data?.find((c) => c.id === categoryId)?.name || categoryId;
}
