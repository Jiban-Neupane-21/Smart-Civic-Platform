import { Outlet } from "react-router-dom";
import NavBar from "./Navbar";
import Footer from "./Footer";

function MainLayout() {
  return (
    <>
      <div style={{ margin: "1px", padding: "1px" }}></div>
      <NavBar />
      <main style={{ padding: "5px", margin: "5px" }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
export default MainLayout;
