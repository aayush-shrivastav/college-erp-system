import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, role } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // --- Redirect to respective dashboard if unauthorized for this specific role ---
    const redirectPath = role === "ADMIN" ? "/admin" : role === "TEACHER" ? "/teacher" : "/student";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
