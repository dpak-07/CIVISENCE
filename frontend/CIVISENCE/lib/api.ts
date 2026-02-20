import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/config";
import { sessionStore } from "@/lib/session";

type ApiErrorBody = {
  success?: boolean;
  message?: string;
  details?: unknown;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

let isClearingUnauthorizedSession = false;

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
    if (error.response?.status === 401 && sessionStore.getAccessToken()) {
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
