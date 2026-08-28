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
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("docuverify_theme");
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("docuverify_theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "docuverify_theme" && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue as "light" | "dark");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

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
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
