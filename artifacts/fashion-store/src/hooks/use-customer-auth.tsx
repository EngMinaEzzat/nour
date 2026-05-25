import { createContext, useContext, ReactNode } from "react";
import {
  useGetCustomerMe,
  useLoginCustomer,
  useLogoutCustomer,
  useRegisterCustomer,
  CustomerAuthResponse,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCustomerMeQueryKey } from "@workspace/api-client-react";
import type { LoginCustomerBody, RegisterCustomerBody } from "@workspace/api-client-react";

interface CustomerAuthContextValue {
  customer: CustomerAuthResponse["customer"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginCustomerBody) => Promise<CustomerAuthResponse>;
  register: (data: RegisterCustomerBody) => Promise<CustomerAuthResponse>;
  logout: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: authResponse, isLoading } = useGetCustomerMe({
    query: {
      queryKey: getGetCustomerMeQueryKey(),
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  const loginMutation = useLoginCustomer();
  const registerMutation = useRegisterCustomer();
  const logoutMutation = useLogoutCustomer();

  async function login(params: LoginCustomerBody): Promise<CustomerAuthResponse> {
    const result = await loginMutation.mutateAsync({ data: params });
    queryClient.setQueryData(getGetCustomerMeQueryKey(), result);
    return result;
  }

  async function register(params: RegisterCustomerBody): Promise<CustomerAuthResponse> {
    const result = await registerMutation.mutateAsync({ data: params });
    queryClient.setQueryData(getGetCustomerMeQueryKey(), result);
    return result;
  }

  async function logout(): Promise<void> {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetCustomerMeQueryKey(), null);
    // Optional: clear other customer specific queries like customer-orders
  }

  return (
    <CustomerAuthContext.Provider value={{
      customer: authResponse?.customer ?? null,
      isLoading,
      isAuthenticated: !!authResponse?.customer,
      login,
      register,
      logout,
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  return ctx;
}
