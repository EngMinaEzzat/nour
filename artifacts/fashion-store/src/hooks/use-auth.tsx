import { createContext, useContext, ReactNode } from "react";
import { useGetMe, useLoginMerchant, useLogoutMerchant, useRegisterMerchant, AuthResponse } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextValue {
  merchant: AuthResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (data: {
    storeName: string;
    slug: string;
    email: string;
    password: string;
    city?: string;
    description: string;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: merchant, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  const loginMutation = useLoginMerchant();
  const registerMutation = useRegisterMerchant();
  const logoutMutation = useLogoutMerchant();

  async function login(email: string, password: string): Promise<AuthResponse> {
    const result = await loginMutation.mutateAsync({ data: { email, password } });
    queryClient.setQueryData(getGetMeQueryKey(), result);
    return result;
  }

  async function register(data: {
    storeName: string;
    slug: string;
    email: string;
    password: string;
    city?: string;
    description: string;
  }): Promise<AuthResponse> {
    const result = await registerMutation.mutateAsync({ data });
    queryClient.setQueryData(getGetMeQueryKey(), result);
    return result;
  }

  async function logout(): Promise<void> {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
  }

  return (
    <AuthContext.Provider value={{
      merchant: merchant ?? null,
      isLoading,
      isAuthenticated: !!merchant,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
