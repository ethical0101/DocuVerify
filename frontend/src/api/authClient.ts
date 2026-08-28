import { api } from "./client";

export type Role = "admin" | "hr" | "viewer";

export interface AuthUser {
  id: string; email: string; role: Role; organization_id: string; status: string;
}
export interface AuthOrganization { id: string; name: string; }
export interface AuthResponse { token: string; user: AuthUser; organization: AuthOrganization; }

const TOKEN_KEY = "docuverify_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Attach the bearer token to every request once a user is logged in.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function register(organization_name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", { organization_name, email, password });
  return data;
}

export async function fetchMe(): Promise<{ user: AuthUser; organization: AuthOrganization }> {
  const { data } = await api.get("/auth/me");
  return data;
}
