import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom SVG Pin to avoid broken CDN / Vite asset issues
const createPinIcon = () =>
  L.divIcon({
    className: "custom-leaflet-pin",
    html: `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
        cursor: grab;
      ">
        <svg viewBox="0 0 24 24" width="38" height="38" fill="#e11d48">
          <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7 13 8 16 1-3 8-10.75 8-16 0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  });

export interface LocationPickerMapProps {
  onLocationSelect: (address: string, coords: { lat: number; lng: number }, isGps?: boolean) => void;
  selectedCoords: { lat: number; lng: number } | null;
  selectedAddress?: string;
  onAddressChange?: (address: string) => void;
}

// Default center: Nepal (Kathmandu Valley / Lalitpur Metropolitan)
const DEFAULT_CENTER: [number, number] = [27.671, 85.312];
const DEFAULT_ZOOM = 13;

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  onLocationSelect,
  selectedCoords,
  selectedAddress = "",
  onAddressChange,
}) => {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reverse geocode using Nominatim OpenStreetMap API
  const fetchAddressFromCoords = useCallback(
    async (lat: number, lng: number, isGps = false) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setReverseLoading(true);
      debounceTimerRef.current = setTimeout(async () => {
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
            onLocationSelect(address, { lat, lng }, isGps);
            return;
          }
        } catch (err) {
          console.warn("Reverse geocoding error:", err);
        } finally {
          setReverseLoading(false);
        }

        // Fallback
        const fallbackAddress = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
        onLocationSelect(fallbackAddress, { lat, lng }, isGps);
      }, 400);
    },
    [onLocationSelect]
  );

  // Move or create marker
  const updateMarker = useCallback(
    (lat: number, lng: number, shouldPan = true, shouldFetchAddress = true, isGps = false) => {
      if (!mapInstanceRef.current) return;

      const map = mapInstanceRef.current;
      const pinIcon = createPinIcon();

      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: pinIcon,
          draggable: true,
          title: "Drag to refine location",
        }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          fetchAddressFromCoords(pos.lat, pos.lng, false);
        });

        markerInstanceRef.current = marker;
      }

      if (shouldPan) {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 15), {
          duration: 1.2,
        });
      }

      if (shouldFetchAddress) {
        fetchAddressFromCoords(lat, lng, isGps);
      }
    },
    [fetchAddressFromCoords]
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = selectedCoords
      ? [selectedCoords.lat, selectedCoords.lng]
      : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: selectedCoords ? 15 : DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Handle user clicking on the map
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      updateMarker(lat, lng, false, true, false);
    });

    // If initial coordinates exist, place marker
    if (selectedCoords) {
      updateMarker(selectedCoords.lat, selectedCoords.lng, false, false, false);
    }

    // Handle size invalidation after rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    // ResizeObserver for reliable tab/stepper transitions
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      map.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // HTML5 Browser Geolocation (Locate Me)
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
        updateMarker(lat, lng, true, true, true);
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Location permission was denied. Please allow location access or click on the map to place your pin.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setGeoError("Location request timed out. Please try again or pick on the map.");
            break;
          default:
            setGeoError("An error occurred while retrieving your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Search places via Nominatim
  const handleSearchPlaces = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchResults(true);
    try {
      // Prioritize search within Nepal or global fallback
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}&countrycodes=np&limit=5`;

      let res = await fetch(url);
      let data: SearchResult[] = await res.json();

      if (!data || data.length === 0) {
        // Fallback search without country filter
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5`;
        res = await fetch(fallbackUrl);
        data = await res.json();
      }

      setSearchResults(data || []);
    } catch (err) {
      console.warn("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setShowSearchResults(false);
    setSearchQuery(result.display_name.split(",")[0]);
    updateMarker(lat, lng, true, false, false);
    onLocationSelect(result.display_name, { lat, lng }, false);
  };

  return (
    <Box sx={{ mt: 1.5, mb: 1.5, width: "100%" }}>
      {/* Top Controls: "Locate Me" button + Search Bar */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mb: 1.5 }}>
        <Button
          variant="contained"
          color="primary"
          size="medium"
          startIcon={
            geoLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <MyLocationIcon />
            )
          }
          onClick={handleGetCurrentLocation}
          disabled={geoLoading}
          sx={{
            minWidth: 200,
            borderRadius: 2,
            fontWeight: 600,
            textTransform: "none",
            boxShadow: "0 2px 8px rgba(14, 165, 233, 0.25)",
          }}
        >
          {geoLoading ? "Detecting GPS..." : "Pin Current Location"}
        </Button>

        {/* Place Search Bar */}
        <Box sx={{ position: "relative", flex: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search area, landmark, or street name (e.g. Patan, Baneshwor)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchPlaces();
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {searchQuery && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setShowSearchResults(false);
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={handleSearchPlaces}
                      disabled={isSearching}
                    >
                      {isSearching ? <CircularProgress size={18} /> : <SearchIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Search Dropdown Results */}
          {showSearchResults && searchResults.length > 0 && (
            <Paper
              elevation={4}
              sx={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 1000,
                mt: 0.5,
                maxHeight: 220,
                overflowY: "auto",
                borderRadius: 2,
              }}
            >
              <List dense disablePadding>
                {searchResults.map((item) => (
                  <ListItem disablePadding key={item.place_id}>
                    <ListItemButton onClick={() => handleSelectSearchResult(item)}>
                      <LocationOnIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <ListItemText
                        primary={item.display_name.split(",").slice(0, 2).join(", ")}
                        secondary={item.display_name.split(",").slice(2).join(", ")}
                        primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                        secondaryTypographyProps={{ variant: "caption", noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Geolocation Error Alert */}
      {geoError && (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }} onClose={() => setGeoError(null)}>
          {geoError}
        </Alert>
      )}

      {/* Map Card */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          overflow: "hidden",
          borderColor: selectedCoords ? "primary.main" : "divider",
          boxShadow: selectedCoords ? "0 0 0 1px rgba(14, 165, 233, 0.2)" : "none",
          transition: "all 0.2s ease",
        }}
      >
        {/* Instruction Banner above map */}
        <Box
          sx={{
            py: 0.8,
            px: 1.5,
            bgcolor: "grey.100",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            📍 <b>Click anywhere</b> on the map or <b>drag the marker pin</b> to set the precise complaint spot.
          </Typography>

          {selectedCoords && (
            <Chip
              size="small"
              icon={<LocationOnIcon fontSize="small" />}
              label={`GPS: ${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: "0.72rem" }}
            />
          )}
        </Box>

        {/* Leaflet Map DOM Element */}
        <Box
          ref={mapContainerRef}
          sx={{
            height: { xs: 280, sm: 360 },
            width: "100%",
            zIndex: 1,
          }}
        />

        {/* Resolved Address Box under the map */}
        <Box sx={{ p: 1.5, bgcolor: "#fafafa", borderTop: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Selected Address / Landmark Details:
            </Typography>
            {reverseLoading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <CircularProgress size={12} />
                <Typography variant="caption" color="text.secondary">
                  Resolving address...
                </Typography>
              </Box>
            )}
          </Box>

          <TextField
            fullWidth
            size="small"
            value={selectedAddress}
            onChange={(e) => onAddressChange?.(e.target.value)}
            placeholder={
              selectedCoords
                ? "Address will be resolved or add specific landmark details here..."
                : "No location selected yet. Click on the map or use 'Pin Current Location'."
            }
            helperText="You can fine-tune this address or add landmark directions (e.g. Near red bridge, Shop No. 12)"
            sx={{ bgcolor: "white", borderRadius: 1 }}
          />
        </Box>
      </Paper>
    </Box>
  );
};
