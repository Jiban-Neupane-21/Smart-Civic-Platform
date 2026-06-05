import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export const withRoleRedirect = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
) => {
  const WithRoleRedirect: React.FC<P> = (props) => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (isAuthenticated && user) {
        // Redirect based on the user's role
        switch (user.role as string) {
          case "superadmin":
            navigate("/superadmin/dashboard");
            break;
          case "municipality_head":
            navigate("/municipality/dashboard");
            break;
          case "department_head":
            navigate("/department/dashboard");
            break;
          case "staff":
            navigate("/staff/dashboard");
            break;
          case "citizen":
          default:
            navigate("/citizen/dashboard");
            break;
        }
      }
    }, [isAuthenticated, user, navigate]);

    return <WrappedComponent {...props} />;
  };
  return WithRoleRedirect;
};
