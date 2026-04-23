import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode;
  role?: "admin" | "customer";
}) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (user.mustChangePassword && loc.pathname !== "/change-password")
    return <Navigate to="/change-password" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace />;
  }
  return <>{children}</>;
}
