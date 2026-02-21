import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_HOME_ROUTES } from "../../services/roleConfig";

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.role) {
    return <Navigate to={ROLE_HOME_ROUTES[user.role]} replace />;
  }

  return children;
}

export default PublicOnlyRoute;
