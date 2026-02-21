const ACCESS_TOKEN_KEY = "civisense_access_token";
const AUTH_USER_KEY = "civisense_auth_user";

const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const tokenStorage = {
  getToken() {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getUser() {
    if (typeof window === "undefined") {
      return null;
    }
    const raw = window.sessionStorage.getItem(AUTH_USER_KEY);
    return raw ? safeParse(raw) : null;
  },
  persistAuth(token, user) {
    if (typeof window === "undefined") {
      return;
    }
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    window.sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },
  clear() {
    if (typeof window === "undefined") {
      return;
    }
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(AUTH_USER_KEY);
  },
};
