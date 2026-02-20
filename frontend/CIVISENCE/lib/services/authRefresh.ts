import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, getFallbackApiBaseUrl } from "@/lib/config";
import { AuthSession, sessionStore } from "@/lib/session";

type AuthEnvelope = {
  success: boolean;
  message?: string;
  data: AuthSession;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retriedWithFallback?: boolean;
};

const isNetworkLikeAxiosError = (error: AxiosError): boolean => {
  if (!error.response) {
    return true;
  }

  const message = (error.message || "").toLowerCase();
  return (
    error.code === "ECONNABORTED" ||
    message.includes("network error") ||
    message.includes("timeout")
  );
};

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

authClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (
      originalRequest &&
      !originalRequest._retriedWithFallback &&
      isNetworkLikeAxiosError(error)
    ) {
      const currentBaseUrl =
        originalRequest.baseURL ?? authClient.defaults.baseURL ?? API_BASE_URL;
      const fallbackBaseUrl = getFallbackApiBaseUrl(currentBaseUrl);
      if (fallbackBaseUrl) {
        originalRequest._retriedWithFallback = true;
        originalRequest.baseURL = fallbackBaseUrl;
        authClient.defaults.baseURL = fallbackBaseUrl;
        return authClient.request(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export const refreshSession = async (): Promise<AuthSession | null> => {
  const refreshToken = sessionStore.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await authClient.post<AuthEnvelope>("/auth/refresh", {
    refreshToken,
  });

  const session = response.data.data;
  await sessionStore.set(session);
  return session;
};
