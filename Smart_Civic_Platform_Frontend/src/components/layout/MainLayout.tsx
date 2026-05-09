import { Outlet } from "react-router-dom";
import { Navbar } from "../Navbar";

function MainLayout() {
  return (
    <>
      <header>
        <Navbar role={"Staff"} />
      </header>
      <main style={{ padding: "5px", margin: "5px" }}>
        <Outlet />
      </main>
    </>
  );
}
export default MainLayout;
