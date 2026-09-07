import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  InputBase,
  IconButton,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  Dialog,
} from "@mui/material";
import { FiSearch, FiX, FiArrowRight } from "react-icons/fi";
import type { DesktopNavItem } from "../../types/navbar.types";

interface NavbarSearchProps {
  items: DesktopNavItem[];
  onNavigate: (href: string) => void;
  isMobile?: boolean;
}

export function NavbarSearch({ items, onNavigate, isMobile = false }: NavbarSearchProps) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter out logout item from search suggestions
  const searchableItems = items.filter(
    (item) => item.label.toLowerCase() !== "logout"
  );

  const filteredItems = query.trim()
    ? searchableItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelect = (href: string) => {
    onNavigate(href);
    setQuery("");
    setIsFocused(false);
    setMobileSearchOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchInputContent = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        maxWidth: 600,
        height: 40,
        borderRadius: "40px",
        border: `1px solid ${
          isFocused ? theme.palette.primary.main : alpha(theme.palette.divider, 0.25)
        }`,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        boxShadow: isFocused
          ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
          : "none",
        transition: "all 0.2s ease",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          px: 2,
        }}
      >
        <InputBase
          placeholder="Search features, notices, complaints..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredItems.length > 0) {
              handleSelect(filteredItems[0].href);
            }
          }}
          sx={{
            flex: 1,
            fontSize: "0.95rem",
            color: "text.primary",
            "& input::placeholder": {
              fontSize: "0.88rem",
              opacity: 0.7,
            },
          }}
        />
        {query && (
          <IconButton
            size="small"
            onClick={() => setQuery("")}
            sx={{ p: 0.5, color: "text.secondary" }}
          >
            <FiX size={16} />
          </IconButton>
        )}
      </Box>

      {/* YouTube-style right search button */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2.5,
          height: "100%",
          bgcolor: alpha(theme.palette.action.hover, 0.08),
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          cursor: "pointer",
          color: "text.secondary",
          "&:hover": {
            bgcolor: alpha(theme.palette.action.hover, 0.14),
            color: "text.primary",
          },
          transition: "background-color 0.2s ease",
        }}
        onClick={() => {
          if (filteredItems.length > 0) {
            handleSelect(filteredItems[0].href);
          }
        }}
      >
        <FiSearch size={18} />
      </Box>
    </Box>
  );

  // If mobile, show icon trigger that opens search modal
  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={() => setMobileSearchOpen(true)}
          sx={{
            color: "text.secondary",
            "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.1) },
          }}
        >
          <FiSearch size={20} />
        </IconButton>

        <Dialog
          open={mobileSearchOpen}
          onClose={() => setMobileSearchOpen(false)}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 2,
              top: 10,
              position: "absolute",
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {searchInputContent}
            {filteredItems.length > 0 && (
              <List sx={{ p: 0, maxHeight: 240, overflowY: "auto" }}>
                {filteredItems.map((item) => (
                  <ListItemButton
                    key={item.href}
                    onClick={() => handleSelect(item.href)}
                    sx={{ borderRadius: 2, py: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                    <FiArrowRight size={14} color="gray" />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Dialog>
      </>
    );
  }

  return (
    <Box
      ref={wrapperRef}
      sx={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        flex: 1,
        maxWidth: 600,
        mx: 3,
      }}
    >
      {searchInputContent}

      {/* Autocomplete Dropdown */}
      {isFocused && filteredItems.length > 0 && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: 46,
            left: 0,
            right: 0,
            zIndex: 1400,
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
            boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, 0.12)}`,
          }}
        >
          <List sx={{ py: 1 }}>
            {filteredItems.map((item) => (
              <ListItemButton
                key={item.href}
                onClick={() => handleSelect(item.href)}
                sx={{
                  px: 2,
                  py: 1.2,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      fontSize: "0.92rem",
                      fontWeight: 500,
                      color: "text.primary",
                    },
                  }}
                />
                <FiArrowRight size={16} style={{ opacity: 0.5 }} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      {isFocused && query.trim() !== "" && filteredItems.length === 0 && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: 46,
            left: 0,
            right: 0,
            zIndex: 1400,
            p: 2,
            borderRadius: 3,
            textAlign: "center",
            border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No matches found for "{query}"
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
