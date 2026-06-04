import { Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <main style={{ padding: "5px", margin: "5px" }}>
      <Outlet />
    </main>
  );
}

export default AuthLayout;
