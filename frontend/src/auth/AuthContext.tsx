import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getToken, setToken, fetchMe, login as apiLogin, register as apiRegister,
  type AuthUser, type AuthOrganization,
} from "../api/authClient";

interface AuthContextValue {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (orgName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    fetchMe()
      .then(({ user, organization }) => { setUser(user); setOrganization(organization); })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password);
    setToken(res.token);
    setUser(res.user);
    setOrganization(res.organization);
  }

  async function register(orgName: string, email: string, password: string) {
    const res = await apiRegister(orgName, email, password);
    setToken(res.token);
    setUser(res.user);
    setOrganization(res.organization);
  }

  function logout() {
    setToken(null);
    setUser(null);
    setOrganization(null);
  }

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
