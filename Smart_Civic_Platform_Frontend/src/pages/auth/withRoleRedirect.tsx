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
        if (user.force_password_reset && !["superadmin", "citizen"].includes(user.role)) {
          navigate("/change-password");
          return;
        }

        // Redirect based on the user's KYC status if required
        const kycCompleted = user.role === "citizen"
          ? user.citizen_details?.kyc_status === "verified"
          : Boolean(user.identity_type && user.identity_number && user.identity_document_url);
        
        if (["municipality_head", "department_head", "staff"].includes(user.role) && !kycCompleted) {
          navigate("/kyc");
          return;
        }

        // Redirect based on the user's role
        switch (user.role as string) {
          case "superadmin":
            navigate("/superadmin/dashboard");
            break;
          case "municipality_head":
            navigate("/municipality_head/dashboard");
            break;
          case "department_head":
            navigate("/department_head/dashboard");
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
