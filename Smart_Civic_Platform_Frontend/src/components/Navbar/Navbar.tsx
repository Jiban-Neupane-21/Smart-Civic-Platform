import type { Role } from "../../types/navbar.types";
import { useNavbar } from "../../hooks/useNavbar";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";

import { Box } from "@mui/material";

interface NavbarProps {
  role: Role;
}

export function Navbar({ role }: NavbarProps) {
  const { config, activePath, navigate } = useNavbar(role);

  return (
    <>
      {/* Desktop Navbar */}
      <Box
        sx={{
          display: {
            xs: "none",
            md: "block",
          },
        }}
      >
        <DesktopNav
          items={config.desktop}
          activePath={activePath}
          onNavigate={navigate}
        />
      </Box>

      {/* Mobile Navbar */}
      <Box
        sx={{
          display: {
            xs: "block",
            md: "none",
          },
        }}
      >
        <MobileNav
          items={config.mobile}
          activePath={activePath}
          onNavigate={navigate}
        />
      </Box>
    </>
  );
}
