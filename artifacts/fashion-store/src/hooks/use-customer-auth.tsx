import { createContext, useContext, ReactNode } from "react";
import {
  useGetCustomerMe,
  useLoginCustomer,
  useLogoutCustomer,
  useRegisterCustomer,
  useGeneratePasskeyRegistrationOptions,
  useVerifyPasskeyRegistration,
  useGeneratePasskeyAuthenticationOptions,
  useVerifyPasskeyAuthentication,
  CustomerAuthResponse,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCustomerMeQueryKey, getGeneratePasskeyRegistrationOptionsQueryKey } from "@workspace/api-client-react";
import type { LoginCustomerBody, RegisterCustomerBody } from "@workspace/api-client-react";

interface CustomerAuthContextValue {
  customer: CustomerAuthResponse["customer"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginCustomerBody) => Promise<CustomerAuthResponse>;
  register: (data: RegisterCustomerBody) => Promise<CustomerAuthResponse>;
  logout: () => Promise<void>;

  // Passkey methods
  generatePasskeyRegistrationOptions: () => Promise<any>;
  verifyPasskeyRegistration: (data: any) => Promise<any>;
  generatePasskeyAuthenticationOptions: (email: string) => Promise<any>;
  verifyPasskeyAuthentication: (data: any) => Promise<CustomerAuthResponse>;
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

  const passkeyRegOptionsQuery = useGeneratePasskeyRegistrationOptions({ query: { queryKey: getGeneratePasskeyRegistrationOptionsQueryKey(), enabled: false } });
  const passkeyRegVerifyMutation = useVerifyPasskeyRegistration();
  const passkeyAuthOptionsMutation = useGeneratePasskeyAuthenticationOptions();
  const passkeyAuthVerifyMutation = useVerifyPasskeyAuthentication();

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
  }

  async function generatePasskeyRegistrationOptions() {
    const res = await passkeyRegOptionsQuery.refetch();
    if (res.error) throw res.error;
    return res.data;
  }

  async function verifyPasskeyRegistration(data: any) {
    return await passkeyRegVerifyMutation.mutateAsync({ data });
  }

  async function generatePasskeyAuthenticationOptions(email: string) {
    return await passkeyAuthOptionsMutation.mutateAsync({ data: { email } });
  }

  async function verifyPasskeyAuthentication(data: any): Promise<CustomerAuthResponse> {
    const result = await passkeyAuthVerifyMutation.mutateAsync({ data });
    queryClient.setQueryData(getGetCustomerMeQueryKey(), result);
    return result as CustomerAuthResponse;
  }

  return (
    <CustomerAuthContext.Provider value={{
      customer: authResponse?.customer ?? null,
      isLoading,
      isAuthenticated: !!authResponse?.customer,
      login,
      register,
      logout,
      generatePasskeyRegistrationOptions,
      verifyPasskeyRegistration,
      generatePasskeyAuthenticationOptions,
      verifyPasskeyAuthentication,
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
