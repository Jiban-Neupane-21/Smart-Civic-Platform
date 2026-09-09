import React, { useEffect, useRef } from "react";
import { Box, Typography, Button, Paper, Stack, Tooltip } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import NavigationIcon from "@mui/icons-material/Navigation";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface IncidentLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  displayAddress?: string;
  landmark?: string | null;
  wardNumber?: number | null;
  municipalityName?: string | null;
  height?: number | string;
}

// Custom red SVG pin
const createPinIcon = () =>
  L.divIcon({
    className: "custom-incident-pin",
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));
      ">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="#dc2626">
          <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7 13 8 16 1-3 8-10.75 8-16 0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

export const IncidentLocationMap: React.FC<IncidentLocationMapProps> = ({
  latitude,
  longitude,
  displayAddress,
  landmark,
  wardNumber,
  municipalityName,
  height = 300,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const hasCoords =
    latitude != null &&
    longitude != null &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    (latitude !== 0 || longitude !== 0);

  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress || `${municipalityName || "Municipality"} Ward ${wardNumber || ""}`)}`;

  useEffect(() => {
    if (!mapContainerRef.current || !hasCoords) return;

    // Clean up previous map if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    try {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        icon: createPinIcon(),
        title: "Complaint Incident Site",
      }).addTo(map);

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 180px; padding: 4px;">
          <b style="color: #b91c1c; font-size: 13px;">📍 Grievance Site</b>
          ${landmark ? `<div style="font-size: 12px; margin-top: 4px; font-weight: 600;">${landmark}</div>` : ""}
          <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">
            ${wardNumber ? `Ward ${wardNumber}` : ""} ${municipalityName ? `• ${municipalityName}` : ""}
          </div>
          <div style="font-size: 10px; color: #6b7280; margin-top: 4px; font-family: monospace;">
            GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}
          </div>
          <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" 
             style="display: inline-block; margin-top: 8px; font-size: 11px; color: #2563eb; text-decoration: underline; font-weight: 600;">
            Start Google Navigation &rarr;
          </a>
        </div>
      `;
      marker.bindPopup(popupContent).openPopup();

      markerRef.current = marker;
      mapInstanceRef.current = map;

      // Invalidate size in case of modal/tab transition
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);

      return () => {
        clearTimeout(timer);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.warn("Leaflet map init error:", err);
    }
  }, [latitude, longitude, hasCoords, landmark, wardNumber, municipalityName, googleMapsUrl]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && hasCoords) {
      mapInstanceRef.current.setView([Number(latitude), Number(longitude)], 16, { animate: true });
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }
  };

  if (!hasCoords) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.50",
          borderRadius: 2,
          textAlign: "center",
        }}
      >
        <LocationOnIcon sx={{ fontSize: 44, color: "text.secondary", mb: 1, opacity: 0.6 }} />
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          No GPS Pin Recorded
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 300, mt: 0.5 }}>
          This grievance was reported via ward selection or registered address. Staff can search via destination ward:
        </Typography>
        {displayAddress && (
          <Typography variant="body2" fontWeight={600} sx={{ mt: 1, color: "primary.main" }}>
            {displayAddress}
          </Typography>
        )}
        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<OpenInNewIcon />}
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ mt: 2, textTransform: "none" }}
        >
          Search Area in Google Maps
        </Button>
      </Paper>
    );
  }

  return (
    <Box sx={{ position: "relative", width: "100%", height, borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Floating map controls */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
        }}
      >
        <Tooltip title="Recenter Pin">
          <Button
            size="small"
            variant="contained"
            color="inherit"
            onClick={handleRecenter}
            sx={{
              minWidth: 36,
              height: 36,
              p: 0,
              bgcolor: "white",
              color: "text.primary",
              boxShadow: 2,
              "&:hover": { bgcolor: "grey.100" },
            }}
          >
            <CenterFocusStrongIcon fontSize="small" />
          </Button>
        </Tooltip>

        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<NavigationIcon fontSize="small" />}
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.78rem",
            boxShadow: 2,
            px: 1.5,
          }}
        >
          Navigate to Site
        </Button>
      </Stack>
    </Box>
  );
};

export default IncidentLocationMap;
