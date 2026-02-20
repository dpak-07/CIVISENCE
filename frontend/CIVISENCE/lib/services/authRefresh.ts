import axios from "axios";
import { API_BASE_URL } from "@/lib/config";
import { AuthSession, sessionStore } from "@/lib/session";

type AuthEnvelope = {
  success: boolean;
  message?: string;
  data: AuthSession;
};

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

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
