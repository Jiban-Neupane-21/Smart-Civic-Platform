import type { Role } from "../../types/navbar.types";
import { useNavbar } from "../../hooks/useNavbar";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { Box } from "@mui/material";
import type { UserRole } from "../../types/userRole.type";

interface NavbarProps {
  role: Role;
}

export function Navbar({ role }: NavbarProps) {
  const { config, activePath, navigate } = useNavbar(role);

  return (
    <>
      {/* Desktop Navbar Display Branch */}
      <Box
        sx={{
          display: {
            xs: "none",
            md: "block",
          },
        }}
      >
        <DesktopNav
          items={config?.desktop || []}
          activePath={activePath}
          onNavigate={navigate}
          role={role as UserRole}
        />
      </Box>

      {/* Mobile Navbar Display Branch */}
      <Box
        sx={{
          display: {
            xs: "block",
            md: "none",
          },
        }}
      >
        <MobileNav
          // Sends the structured object containing .primary and .secondary
          items={config?.mobile || { primary: [], secondary: [] }}
          activePath={activePath}
          onNavigate={navigate}
          role={role as UserRole}
        />
      </Box>
    </>
  );
}
