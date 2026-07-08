import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../lib/api.js";

// Customer authentication. Keeps a Bearer token in localStorage (same pattern
// as the admin panel) and exposes login / signup / Google / logout. The token
// is separate from the admin token and only works on /api/auth + linking orders.

const TOKEN_KEY = "gunji_customer_token";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [ready, setReady] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");

  const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), []);

  const applySession = useCallback((data) => {
    if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data?.customer) setCustomer(data.customer);
    return data;
  }, []);

  // Boot: learn whether Google is enabled, and restore any existing session.
  useEffect(() => {
    let alive = true;

    apiGet("/api/auth/config")
      .then((c) => alive && setGoogleClientId(c.googleEnabled ? c.googleClientId : ""))
      .catch(() => {});

    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    apiGet("/api/auth/me", { token })
      .then((d) => alive && setCustomer(d.customer))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => alive && setReady(true));

    return () => {
      alive = false;
    };
  }, [getToken]);

  const signup = useCallback((body) => apiPost("/api/auth/signup", body).then(applySession), [applySession]);
  const login = useCallback((body) => apiPost("/api/auth/login", body).then(applySession), [applySession]);
  const loginWithGoogle = useCallback(
    (credential) => apiPost("/api/auth/google", { credential }).then(applySession),
    [applySession]
  );

  const logout = useCallback(async () => {
    const token = getToken();
    try {
      await apiPost("/api/auth/logout", {}, { token });
    } catch {
      // best effort — clear locally regardless
    }
    localStorage.removeItem(TOKEN_KEY);
    setCustomer(null);
  }, [getToken]);

  const value = useMemo(
    () => ({ customer, ready, googleClientId, getToken, signup, login, loginWithGoogle, logout }),
    [customer, ready, googleClientId, getToken, signup, login, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
