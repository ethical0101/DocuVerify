import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "../api/authClient";

export default function ProtectedRoute({ children, requireRole }: { children: React.ReactNode; requireRole?: Role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
