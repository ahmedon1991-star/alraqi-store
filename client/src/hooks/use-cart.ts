import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest, getSessionId } from "@/lib/api";

export function useCart() {
  return useQuery({
    queryKey: ["/api/cart"],
    queryFn: () => apiRequest("/api/cart"),
  });
}

export function useCartCount() {
  const { data } = useCart();
  return data?.count ?? 0;
}

export function useAddToCart() {
  return useMutation({
    mutationFn: (data: { productId: string; size?: string; measurement?: string }) =>
      apiRequest("/api/cart", {
        method: "POST",
        body: JSON.stringify({ 
          productId: data.productId, 
          sessionId: getSessionId(), 
          quantity: 1, 
          size: data.size, 
          measurement: data.measurement 
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });
}

export function useUpdateCartQuantity() {
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      apiRequest(`/api/cart/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });
}

export function useRemoveFromCart() {
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/cart/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });
}
