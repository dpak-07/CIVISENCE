import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, getFallbackApiBaseUrl } from "@/lib/config";
import { sessionStore } from "@/lib/session";
import { refreshSession } from "@/lib/services/authRefresh";

type ApiErrorBody = {
  success?: boolean;
  message?: string;
  details?: unknown;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retriedWithFallback?: boolean;
};

const isNetworkLikeAxiosError = (error: AxiosError<ApiErrorBody>): boolean => {
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

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

let isClearingUnauthorizedSession = false;
let isRefreshingSession = false;
let refreshPromise: Promise<ReturnType<typeof refreshSession>> | null = null;

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url || "";
    const isAuthRoute =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout");

    if (
      originalRequest &&
      !originalRequest._retriedWithFallback &&
      isNetworkLikeAxiosError(error)
    ) {
      const currentBaseUrl =
        originalRequest.baseURL ?? apiClient.defaults.baseURL ?? API_BASE_URL;
      const fallbackBaseUrl = getFallbackApiBaseUrl(currentBaseUrl);
      if (fallbackBaseUrl) {
        originalRequest._retriedWithFallback = true;
        originalRequest.baseURL = fallbackBaseUrl;
        apiClient.defaults.baseURL = fallbackBaseUrl;
        return apiClient.request(originalRequest);
      }
    }

    if (status === 401 && sessionStore.getAccessToken() && !isAuthRoute) {
      try {
        if (!isRefreshingSession) {
          isRefreshingSession = true;
          refreshPromise = refreshSession();
        }

        const newSession = await refreshPromise;
        if (newSession?.accessToken && originalRequest) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newSession.accessToken}`;
          isRefreshingSession = false;
          return apiClient.request(originalRequest);
        }
      } catch {
        // Fall through to clear session.
      } finally {
        isRefreshingSession = false;
        refreshPromise = null;
      }
    }

    if (status === 401 && sessionStore.getAccessToken()) {
      if (!isClearingUnauthorizedSession) {
        isClearingUnauthorizedSession = true;
        try {
          await sessionStore.clear();
        } finally {
          isClearingUnauthorizedSession = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    return (
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Request failed"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
};
