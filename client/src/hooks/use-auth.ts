import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, clearCustomerToken, getCustomerToken } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export type CustomerUser = {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  authProvider: string;
  biometricEnabled?: boolean;
  biometricToken?: string;
};

async function fetchCurrentUser() {
  if (!getCustomerToken()) {
    return null;
  }

  try {
    const data = await apiRequest("/api/auth/me");
    return data.user as CustomerUser;
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? (error as { status?: number }).status : undefined;
    if (status === 401) {
      clearCustomerToken();
      return null;
    }

    throw error;
  }
}

export function useCurrentUser() {
  const token = getCustomerToken();
  return useQuery({
    queryKey: ["/api/auth/me", token], // Include token in key to force re-fetch when token changes
    queryFn: async () => {
      if (!token) return null;
      try {
        const data = await apiRequest("/api/auth/me");
        return data.user as CustomerUser;
      } catch (error) {
        // If 401, token is invalid, clear it
        if (typeof error === 'object' && error && 'status' in error && (error as any).status === 401) {
          clearCustomerToken();
          return null;
        }
        throw error;
      }
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      try {
        await apiRequest("/api/auth/logout", { method: "POST" });
      } finally {
        clearCustomerToken();
      }
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });
}
