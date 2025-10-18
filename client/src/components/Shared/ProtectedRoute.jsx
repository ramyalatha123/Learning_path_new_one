import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (roles.length && !roles.includes(user.role)) {
    return <div style={{ padding: "20px" }}>Access denied ❌</div>;
  }

  return children;
};

export default ProtectedRoute;
