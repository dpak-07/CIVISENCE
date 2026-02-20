import { apiClient } from "@/lib/api";
import { AuthSession, sessionStore } from "@/lib/session";

type AuthEnvelope = {
  success: boolean;
  message?: string;
  data: AuthSession;
};

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

const saveSession = (session: AuthSession) => {
  return sessionStore.set(session).then(() => session);
};

export const loginUser = async (input: LoginInput): Promise<AuthSession> => {
  const response = await apiClient.post<AuthEnvelope>("/auth/login", input);
  return saveSession(response.data.data);
};

export const registerUser = async (
  input: RegisterInput
): Promise<AuthSession> => {
  const response = await apiClient.post<AuthEnvelope>("/auth/register", input);
  return saveSession(response.data.data);
};

export const logoutUser = async (): Promise<void> => {
  const refreshToken = sessionStore.getRefreshToken();

  try {
    if (refreshToken) {
      await apiClient.post("/auth/logout", { refreshToken });
    }
  } finally {
    await sessionStore.clear();
  }
};
