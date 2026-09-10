import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  Tooltip,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import VerifiedIcon from "@mui/icons-material/Verified";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { publicApi } from "../api";
import type { ActiveMunicipality } from "../api/types";
import {
  ACTIVE_MUNICIPALITY_BOUNDARIES,
  resolveActiveJurisdiction,
  generateSyntheticBoundary,
  type MunicipalityBoundary,
} from "../utils/geo/municipalityBoundaries";

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
  onLocationSelect: (address: string, coords: { lat: number; lng: number } | null, isGps?: boolean) => void;
  selectedCoords: { lat: number; lng: number } | null;
  selectedAddress?: string;
  onAddressChange?: (address: string) => void;
  activeMunicipalities?: ActiveMunicipality[];
  onMunicipalityDetect?: (municipality: ActiveMunicipality) => void;
  targetMunicipalityId?: string;
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
  activeMunicipalities: externalActiveMunis,
  onMunicipalityDetect,
  targetMunicipalityId,
}) => {
  const [internalActiveMunis, setInternalActiveMunis] = useState<ActiveMunicipality[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);

  // Boundary verification state
  const [boundaryError, setBoundaryError] = useState<{
    message: string;
    nearest: MunicipalityBoundary | null;
    distanceKm: number;
  } | null>(null);
  const [verifiedMunicipality, setVerifiedMunicipality] = useState<MunicipalityBoundary | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load active municipalities if not passed via props
  useEffect(() => {
    if (externalActiveMunis && externalActiveMunis.length > 0) {
      setInternalActiveMunis(externalActiveMunis);
      return;
    }
    publicApi.getActiveMunicipalities()
      .then((res) => {
        if (res.success && res.data) {
          setInternalActiveMunis(res.data);
        }
      })
      .catch((err) => console.warn("Failed to load active municipalities for map:", err));
  }, [externalActiveMunis]);

  const activeMunicipalities = useMemo(() => {
    return (externalActiveMunis && externalActiveMunis.length > 0)
      ? externalActiveMunis
      : internalActiveMunis;
  }, [externalActiveMunis, internalActiveMunis]);

  // Compute boundary objects for all active municipalities
  const activeBoundaries = useMemo<MunicipalityBoundary[]>(() => {
    if (activeMunicipalities.length === 0) {
      return Object.values(ACTIVE_MUNICIPALITY_BOUNDARIES);
    }
    return activeMunicipalities.map((m) => {
      const key = m.official_name.trim().toLowerCase();
      const existing =
        ACTIVE_MUNICIPALITY_BOUNDARIES[key] ||
        Object.values(ACTIVE_MUNICIPALITY_BOUNDARIES).find((b) =>
          b.aliases.some((alias) => key.includes(alias) || alias.includes(key))
        );
      if (existing) {
        return existing;
      }
      // Fallback synthetic boundary if no predefined polygon exists
      return generateSyntheticBoundary(m.official_name, 27.7, 85.3);
    });
  }, [activeMunicipalities]);

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

  // Move or create marker strictly when inside an active municipality
  const updateMarker = useCallback(
    (lat: number, lng: number, shouldPan = true, shouldFetchAddress = true, isGps = false) => {
      if (!mapInstanceRef.current) return;

      // Execute Algorithm 6: Jordan Curve Ray-Casting against active boundaries
      const check = resolveActiveJurisdiction(lat, lng, activeMunicipalities);

      if (!check.isInside) {
        const nearestName = check.nearestBoundary?.name || "Active Partner Municipality";
        const dist = check.distanceToNearestKm;
        setBoundaryError({
          message: `Location is outside active partner municipalities. Smart Civic Platform only accepts grievances within active partner boundaries.`,
          nearest: check.nearestBoundary,
          distanceKm: dist,
        });
        setVerifiedMunicipality(null);

        // Remove marker if outside
        if (markerInstanceRef.current) {
          mapInstanceRef.current.removeLayer(markerInstanceRef.current);
          markerInstanceRef.current = null;
        }
        onLocationSelect("", null, false);
        return;
      }

      // Inside an active municipality
      setBoundaryError(null);
      setVerifiedMunicipality(check.matchedBoundary);

      // Notify parent of detected municipality to auto-select dropdowns
      if (onMunicipalityDetect && check.matchedBoundary && activeMunicipalities.length > 0) {
        const matched = activeMunicipalities.find((m) =>
          m.official_name.toLowerCase().includes(check.matchedBoundary!.name.toLowerCase()) ||
          check.matchedBoundary!.name.toLowerCase().includes(m.official_name.toLowerCase())
        );
        if (matched) {
          onMunicipalityDetect(matched);
        }
      }

      const map = mapInstanceRef.current;
      const pinIcon = createPinIcon();

      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          icon: pinIcon,
          draggable: true,
          title: "Drag to refine location within boundary",
        }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          updateMarker(pos.lat, pos.lng, false, true, false);
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
    [activeMunicipalities, onMunicipalityDetect, onLocationSelect, fetchAddressFromCoords]
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

    // Layer group for municipal boundary polygons
    const polygonsLayer = L.layerGroup().addTo(map);
    polygonsLayerRef.current = polygonsLayer;

    mapInstanceRef.current = map;

    // Handle user clicking anywhere on the map
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
      polygonsLayerRef.current = null;
    };
  }, []); // Run once on mount

  // Render & update active municipality polygon overlays on the map
  useEffect(() => {
    if (!mapInstanceRef.current || !polygonsLayerRef.current) return;
    const layerGroup = polygonsLayerRef.current;
    layerGroup.clearLayers();

    activeBoundaries.forEach((boundary) => {
      const polygon = L.polygon(boundary.polygon, {
        color: "#0284c7",
        weight: 2,
        fillColor: "#0ea5e9",
        fillOpacity: 0.12,
        dashArray: "4, 6",
      });

      polygon.bindTooltip(
        `<b>🏛️ ${boundary.name}</b><br/><span style="font-size:11px;color:#0284c7;">Active Partner Service Area</span>`,
        {
          sticky: true,
          direction: "top",
        }
      );

      // Clicking directly on the polygon sets the pin
      polygon.on("click", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        updateMarker(e.latlng.lat, e.latlng.lng, false, true, false);
      });

      polygon.addTo(layerGroup);
    });

    // If no coordinates selected, fit map view to enclose active boundaries
    if (!selectedCoords && activeBoundaries.length > 0) {
      const allCoords = activeBoundaries.flatMap((b) => b.polygon);
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
      }
    }
  }, [activeBoundaries, updateMarker, selectedCoords]);

  // Fly to target municipality if selected externally (e.g. from dropdown)
  useEffect(() => {
    if (!targetMunicipalityId || !mapInstanceRef.current) return;
    const matchedMuni = activeMunicipalities.find((m) => m.id === targetMunicipalityId);
    if (!matchedMuni) return;

    const key = matchedMuni.official_name.trim().toLowerCase();
    const boundary =
      ACTIVE_MUNICIPALITY_BOUNDARIES[key] ||
      activeBoundaries.find((b) => b.name.toLowerCase().includes(key) || key.includes(b.name.toLowerCase()));

    if (boundary) {
      mapInstanceRef.current.flyToBounds(boundary.polygon, {
        duration: 1.2,
        padding: [25, 25],
      });
    }
  }, [targetMunicipalityId, activeMunicipalities, activeBoundaries]);

  // Smooth fly-to clicked boundary chip
  const handleFlyToBoundary = (boundary: MunicipalityBoundary) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyToBounds(boundary.polygon, {
      duration: 1.2,
      padding: [25, 25],
    });
  };

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
            setGeoError("Location permission was denied. Please allow location access or click within an active municipal boundary.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setGeoError("Location request timed out. Please try again or click inside an active municipality.");
            break;
          default:
            setGeoError("An error occurred while fetching your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Place Search via Nominatim OpenStreetMap
  const handleSearchPlaces = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}&countrycodes=np&limit=5`;

      const res = await fetch(url);
      const data: SearchResult[] = await res.json();
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
  };

  return (
    <Box sx={{ mt: 1.5, mb: 1.5, width: "100%" }}>
      {/* Quick Jump Bar: Active Partner Municipalities */}
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5 }}>
          <LocationCityIcon fontSize="inherit" color="primary" /> Active Service Areas:
        </Typography>
        {activeBoundaries.map((boundary) => {
          const isSelected = verifiedMunicipality?.name === boundary.name;
          return (
            <Chip
              key={boundary.name}
              label={`🏛️ ${boundary.name}`}
              size="small"
              clickable
              color={isSelected ? "primary" : "default"}
              variant={isSelected ? "filled" : "outlined"}
              onClick={() => handleFlyToBoundary(boundary)}
              sx={{ fontWeight: 600, fontSize: "0.75rem" }}
            />
          );
        })}
      </Box>

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
            placeholder="Search within active municipalities (e.g. Tokha, Bharatpur)..."
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

      {/* Out of Service Area Warning Banner */}
      {boundaryError && (
        <Alert
          severity="error"
          icon={<WarningAmberIcon />}
          sx={{ mb: 1.5, borderRadius: 2 }}
          action={
            boundaryError.nearest ? (
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={() => handleFlyToBoundary(boundaryError.nearest!)}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Go to {boundaryError.nearest.name}
              </Button>
            ) : undefined
          }
        >
          <Typography variant="body2" fontWeight={700}>
            Location Outside Service Area
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.25 }}>
            {boundaryError.message}
            {boundaryError.nearest && (
              <b> (Nearest active municipality: {boundaryError.nearest.name}, ~{boundaryError.distanceKm} km away)</b>
            )}
          </Typography>
        </Alert>
      )}

      {/* Map Card */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          overflow: "hidden",
          borderColor: verifiedMunicipality ? "success.main" : boundaryError ? "error.main" : "divider",
          boxShadow: verifiedMunicipality
            ? "0 0 0 1px rgba(16, 185, 129, 0.25)"
            : boundaryError
            ? "0 0 0 1px rgba(239, 68, 68, 0.25)"
            : "none",
          transition: "all 0.2s ease",
        }}
      >
        {/* Instruction & Status Banner above map */}
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
            📍 Click inside a <b>highlighted blue boundary</b> or drag the pin to set the grievance location.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {verifiedMunicipality && (
              <Chip
                size="small"
                icon={<VerifiedIcon fontSize="small" sx={{ color: "success.main !important" }} />}
                label={`Verified: ${verifiedMunicipality.name}`}
                color="success"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: "0.72rem" }}
              />
            )}

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
                : "No location selected yet. Click inside an active municipal boundary."
            }
            helperText="You can fine-tune this address or add landmark directions (e.g. Near ward office, Chowk)"
            sx={{ bgcolor: "white", borderRadius: 1 }}
          />
        </Box>
      </Paper>
    </Box>
  );
};
