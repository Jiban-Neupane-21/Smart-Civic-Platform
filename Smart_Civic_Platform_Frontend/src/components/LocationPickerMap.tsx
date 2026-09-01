import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Paper,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import MapIcon from "@mui/icons-material/Map";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default leaflet marker icon resolution under Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationPickerMapProps {
  onLocationSelect: (address: string, coords: { lat: number; lng: number }) => void;
  currentAddress?: string;
}

// Default center: Kathmandu / Lalitpur Metropolitan, Nepal
const DEFAULT_CENTER: [number, number] = [27.671, 85.312];
const DEFAULT_ZOOM = 13;

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  onLocationSelect,
}) => {
  const [showMap, setShowMap] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Reverse geocode using Nominatim OpenStreetMap API
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const address =
          data.display_name || `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onLocationSelect(address, { lat, lng });
        return;
      }
    } catch (err) {
      console.warn("Reverse geocoding error:", err);
    } finally {
      setReverseLoading(false);
    }
    // Fallback if reverse geocode fails or network issue
    const fallbackAddress = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
    onLocationSelect(fallbackAddress, { lat, lng });
  };

  // Initialize or re-render map when map container is toggled on
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = selectedCoords
        ? [selectedCoords.lat, selectedCoords.lng]
        : DEFAULT_CENTER;

      const map = L.map(mapContainerRef.current).setView(
        initialCenter,
        DEFAULT_ZOOM
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;

      // Handle click on map to set pin
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        updateMarker(lat, lng);
        fetchAddressFromCoords(lat, lng);
      });
    }

    // Ensure Leaflet resizes properly after container mounts
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
  }, [showMap]);

  // Update marker position on map
  const updateMarker = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    if (mapInstanceRef.current) {
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(
          mapInstanceRef.current
        );
        marker.on("dragend", () => {
          const position = marker.getLatLng();
          setSelectedCoords({ lat: position.lat, lng: position.lng });
          fetchAddressFromCoords(position.lat, position.lng);
        });
        markerInstanceRef.current = marker;
      }
      mapInstanceRef.current.panTo([lat, lng]);
    }
  };

  // HTML5 Browser Geolocation
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGeoLoading(false);
        setShowMap(true);
        updateMarker(lat, lng);
        fetchAddressFromCoords(lat, lng);
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Location permission denied. Please allow location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location information unavailable.");
            break;
          case error.TIMEOUT:
            setGeoError("Location request timed out. Try again.");
            break;
          default:
            setGeoError("An unknown error occurred while retrieving location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mb: 1.5 }}>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={
            geoLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <MyLocationIcon fontSize="small" />
            )
          }
          onClick={handleGetCurrentLocation}
          disabled={geoLoading}
          sx={{ borderRadius: 2 }}
        >
          {geoLoading ? "Detecting GPS..." : "Use Current Location"}
        </Button>

        <Button
          variant="outlined"
          color={showMap ? "secondary" : "info"}
          size="small"
          startIcon={<MapIcon fontSize="small" />}
          onClick={() => setShowMap((prev) => !prev)}
          sx={{ borderRadius: 2 }}
        >
          {showMap ? "Hide Map" : "Pick Exact Spot on Map"}
        </Button>

        {selectedCoords && (
          <Chip
            icon={<LocationOnIcon />}
            label={`GPS: ${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`}
            color="success"
            variant="outlined"
            size="small"
          />
        )}

        {reverseLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="textSecondary">
              Resolving address...
            </Typography>
          </Box>
        )}
      </Box>

      {geoError && (
        <Alert
          severity="warning"
          sx={{ mb: 1.5 }}
          onClose={() => setGeoError(null)}
        >
          {geoError}
        </Alert>
      )}

      {showMap && (
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#fcfcfc",
          }}
        >
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ display: "block", mb: 1, px: 0.5 }}
          >
            📍 Click anywhere on the map or drag the marker to set the exact complaint location.
          </Typography>
          <Box
            ref={mapContainerRef}
            sx={{
              height: 320,
              width: "100%",
              borderRadius: 1.5,
              zIndex: 1,
            }}
          />
        </Paper>
      )}
    </Box>
  );
};
