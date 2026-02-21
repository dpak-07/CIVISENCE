import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { isRole } from "../services/roleConfig";
import { tokenStorage } from "../services/tokenStorage";

const AuthContext = createContext(null);

const getInitialAuthState = () => {
  const token = tokenStorage.getToken();
  const user = tokenStorage.getUser();

  if (!token || !user || !isRole(user.role)) {
    tokenStorage.clear();
    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }

  return {
    token,
    user,
    isAuthenticated: true,
  };
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getInitialAuthState);

  const login = useCallback(async (payload) => {
    const response = await authService.login(payload);
    tokenStorage.persistAuth(response.token, response.user);
    setAuthState({
      token: response.token,
      user: response.user,
      isAuthenticated: true,
    });
    return response;
  }, []);

  const signupCitizen = useCallback(async (payload) => {
    const response = await authService.signupCitizen(payload);
    tokenStorage.persistAuth(response.token, response.user);
    setAuthState({
      token: response.token,
      user: response.user,
      isAuthenticated: true,
    });
    return response;
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setAuthState({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  }, []);

  const value = useMemo(
    () => ({
      ...authState,
      login,
      signupCitizen,
      logout,
    }),
    [authState, login, signupCitizen, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
};
