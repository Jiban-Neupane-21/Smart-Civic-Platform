# Geospatial & Map Algorithms for Complaint Submission (Submit Complaint)

> **Document Type:** Technical & Algorithmic Architecture Specification  
> **Relevant Chapters:** Chapter 3: System Analysis and Design (`doc/Chapter_3_System_Analysis_and_Design.md`)  
> **Target Touchpoints:**  
> - Frontend: `Smart_Civic_Platform_Frontend/src/components/LocationPickerMap.tsx`  
> - Frontend: `Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx`  
> - Frontend Utils: `Smart_Civic_Platform_Frontend/src/utils/geo/municipalityBoundaries.ts`  
> - Backend Service: `Smart_Civic_Platform_Backend/src/service/duplicate-detector.service.ts`  
> - Backend Controller & Route: `modules/citizen/controller/citizen.controller.ts` (`/complaints/check-duplicates`)

---

## 1. Executive Summary & Problem Context

In civic grievance reporting, physical location is the single most critical piece of metadata. If a grievance is logged with ambiguous, missing, or out-of-jurisdiction spatial coordinates:
1. **Administrative Gridlock:** Complaints are assigned to the wrong municipality or ward office, resulting in administrative rejections or delays across jurisdictional boundaries.
2. **Duplicate Inundation:** Multiple citizens in the same street independently file separate tickets for identical civic hazards (e.g., burst water pipes, fallen electric poles, road potholes).
3. **Field Dispatch Inefficiency:** Municipal field technicians cannot navigate to exact locations or optimize inspection routes.

To solve these challenges during **Grievance Submission (`SubmitComplain.tsx`)**, the Smart Civic Platform employs a coordinated suite of **computational spatial algorithms** operating on the interactive map (`LocationPickerMap.tsx`) and the backend processing pipeline.

---

## 2. Spatial Algorithms Architecture in Submit Complaint

```
                   Citizen Interacts with Map (LocationPickerMap.tsx)
                   │
                   ├──> (A) Clicks "Pin Current Location" ──> [HTML5 W3C Geolocation API]
                   │                                                  │
                   └──> (B) Drags/Drops Pin or Clicks Map ─────────────┤
                                                                      ▼
                                              [Coordinate Extraction: P(lat, lng)]
                                                                      │
                                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ALGORITHM 1: Point-in-Polygon (Ray-Casting / Jordan Curve Theorem)                                               │
│ Verifies if P(lat, lng) is strictly within an Active Partner Municipality boundary polygon                       │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        │                                                 │
                        ▼                                                 ▼
             [ INSIDE JURISDICTION ]                           [ OUTSIDE JURISDICTION ]
                        │                                                 │
                        │                                                 ▼
                        │                      ┌──────────────────────────────────────────────────────────┐
                        │                      │ ALGORITHM 2: Haversine Nearest Proximity Calculation     │
                        │                      │ Computes geodesic distance to nearest active boundary    │
                        │                      │ Renders: "Nearest: Bharatpur (~4.2 km away) [Fly To]"    │
                        │                      └──────────────────────────────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ALGORITHM 3: Asynchronous Debounced Reverse Geocoding (OSM Nominatim + Rate-Limit Buffer)                         │
│ Resolves raw (lat, lng) into human-readable street, chowk, and ward address text with 400ms debounce buffer      │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────┘
                                                 │
                                                 ▼
                               [ Citizen Fills Title, Desc, Category ]
                                                 │
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ALGORITHM 4: Spatiotemporal Near-Duplicate Grievance Detection Engine (Haversine + N-Gram Cosine Similarity)     │
│ Cross-references P(lat, lng) with open tickets within 750m radius (50m immediate / 350m street / 750m zone)    │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        │                                                 │
                        ▼                                                 ▼
            [ DUPLICATE DETECTED (Score >= 55%) ]             [ UNIQUE COMPLAINT ]
            Prompts citizen: "+1 Upvote / Me Too"             Saves complaint to Supabase
            Subscribes to ticket; prevents backlog            Calculates Severity & SLA Due Time
```

---

## 3. Detailed Algorithmic Specifications

---

### Algorithm 1: Point-in-Polygon (Ray-Casting / Jordan Curve Theorem)

* **Academic Reference in Report:** Chapter 3, Section 3.3 (Algorithm 2) & Section 3.1.1 (UC-02)
* **Source Code Location:** `Smart_Civic_Platform_Frontend/src/utils/geo/municipalityBoundaries.ts` $\rightarrow$ `isPointInPolygon()`
* **Primary Objective:** Enforces strict municipal geofencing. Determines whether a coordinate $P(\text{lat}, \text{lng})$ clicked or GPS-located by the citizen lies within the legitimate geographic boundary polygon of an active municipality.

#### A. Mathematical Formulation
Based on the **Jordan Curve Theorem**, any closed simple polygon divides the two-dimensional plane into an interior region and an exterior region. If a semi-infinite ray is cast from test point $P$ along the positive abscissa (eastward horizontal ray), the point $P$ is inside the polygon if and only if the ray intersects the polygon's edges an **odd number of times**.

Given test point $P = (x_0, y_0) = (\text{lng}, \text{lat})$ and polygon vertices $V = \{(x_1, y_1), (x_2, y_2), \dots, (x_n, y_n)\}$:

For each line segment joining vertex $V_i = (x_i, y_i)$ and $V_j = (x_j, y_j)$:
1. **Vertical Bounds Check:** The horizontal ray at altitude $y_0$ can intersect segment $V_i V_j$ only if $y_0$ lies strictly between $y_i$ and $y_j$:
   $$(y_i > y_0) \neq (y_j > y_0)$$
2. **Horizontal Intersection Check:** The ray travels towards $+ \infty$ along the $x$-axis. The $x$-coordinate of the intersection point $x_{\text{int}}$ of the line passing through $V_i V_j$ with the line $y = y_0$ is computed via linear interpolation:
   $$x_{\text{int}} = \frac{(x_j - x_i) \cdot (y_0 - y_i)}{y_j - y_i} + x_i$$
3. An intersection occurs to the right of $P$ if:
   $$x_0 < x_{\text{int}}$$
4. The intersection counter toggles state (`inside = !inside`).

```
          Ray y = y0
P (x0, y0) ─────────────> (Intersects Edge 1: Odd -> INSIDE)
                       \
                        \ (Intersects Edge 2: Even -> OUTSIDE)
```

#### B. Implementation in Code
```typescript
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lati, lngi] = polygon[i];
    const [latj, lngj] = polygon[j];

    const intersect =
      lngi > lng !== lngj > lng &&
      lat < ((latj - lati) * (lng - lngi)) / (lngj - lngi) + lati;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}
```

#### C. Time & Space Complexity
* **Time Complexity:** $\mathcal{O}(N)$ where $N$ is the total number of polygon boundary vertices (typically $8 \le N \le 30$ vertices per municipality), executing in $< 0.05\text{ ms}$ on client devices.
* **Space Complexity:** $\mathcal{O}(1)$ auxiliary memory.

---

### Algorithm 2: Haversine Great-Circle Geodesic Distance Formula

* **Academic Reference in Report:** Chapter 3, Section 3.3 (Algorithm 1 & 4)
* **Source Code Location:**
  - Frontend: `src/utils/geo/municipalityBoundaries.ts` $\rightarrow$ `calculateDistanceKm()`
  - Backend: `src/service/duplicate-detector.service.ts` $\rightarrow$ `haversineDistanceMeters()`
* **Primary Objective:**
  1. **User Guidance on Misclick:** When a citizen clicks outside the municipal boundary, calculates the exact distance in kilometers to the nearest active municipality centroid and presents a one-click re-center button.
  2. **Duplicate Grievance Radius Verification:** Calculates the physical ground distance in meters between a new submission and previously registered grievances.

#### A. Mathematical Formulation
Earth is approximated as a sphere of mean radius $R = 6,371,000\text{ meters}$ ($6,371\text{ km}$). Given two points $P_1 = (\phi_1, \lambda_1)$ and $P_2 = (\phi_2, \lambda_2)$ in decimal degrees (where $\phi = \text{latitude}$, $\lambda = \text{longitude}$):

1. Convert angular coordinates to radians:
   $$\Delta \phi = \frac{(\phi_2 - \phi_1) \cdot \pi}{180}, \quad \Delta \lambda = \frac{(\lambda_2 - \lambda_1) \cdot \pi}{180}$$
2. Compute the square of half the chord length between the points ($a$):
   $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\left(\frac{\phi_1 \cdot \pi}{180}\right) \cdot \cos\left(\frac{\phi_2 \cdot \pi}{180}\right) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
3. Compute the angular distance in radians ($c$):
   $$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
4. Compute the spherical surface distance ($d$):
   $$d = R \cdot c$$

#### B. Implementation in Code
```typescript
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

---

### Algorithm 3: Synthetic Convex Polygon Generation (Trigonometric Radial Distribution)

* **Source Code Location:** `Smart_Civic_Platform_Frontend/src/utils/geo/municipalityBoundaries.ts` $\rightarrow$ `generateSyntheticBoundary()`
* **Primary Objective:** Provides zero-configuration fallback geofences. When a newly onboarded municipality does not yet possess official GIS survey shapefile polygons, the platform mathematically generates an 8-sided regular boundary polygon around the municipal center coordinates with an administrative service radius of $\approx 5.5\text{ km}$.

#### A. Mathematical Formulation
To convert a linear distance $R_{\text{service}} = 5.5\text{ km}$ into angular degrees while adjusting for meridian convergence at latitude $\phi_0$:
1. Latitude angular step ($\Delta \phi$):
   $$\Delta \phi = \frac{R_{\text{service}}}{110.574\text{ km/deg}}$$
2. Longitude angular step ($\Delta \lambda$) corrected by cosine projection:
   $$\Delta \lambda = \frac{R_{\text{service}}}{111.320 \cdot \cos\left(\frac{\phi_0 \cdot \pi}{180}\right)\text{ km/deg}}$$
3. For an $M$-sided polygon ($M = 8$, representing cardinal and intercardinal compass directions), generate vertex coordinates for $i \in \{0, 1, \dots, M\}$:
   $$\theta_i = \frac{2 \pi \cdot i}{M}$$
   $$\phi_i = \phi_0 + \Delta \phi \cdot \sin(\theta_i)$$
   $$\lambda_i = \lambda_0 + \Delta \lambda \cdot \cos(\theta_i)$$

```typescript
export function generateSyntheticBoundary(
  name: string, 
  centerLat: number, 
  centerLng: number
): MunicipalityBoundary {
  const radiusKm = 5.5;
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.320 * Math.cos((centerLat * Math.PI) / 180));

  const steps = 8;
  const polygon: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    polygon.push([
      centerLat + latDelta * Math.sin(angle),
      centerLng + lngDelta * Math.cos(angle),
    ]);
  }

  return {
    name,
    aliases: [name.toLowerCase()],
    district: "",
    province: "",
    center: [centerLat, centerLng],
    zoom: 13,
    boundingBox: [
      centerLat - latDelta,
      centerLng - lngDelta,
      centerLat + latDelta,
      centerLng + lngDelta,
    ],
    polygon,
  };
}
```

---

### Algorithm 4: Asynchronous Debounced Reverse Geocoding & Landmark Resolution

* **Source Code Location:** `Smart_Civic_Platform_Frontend/src/components/LocationPickerMap.tsx` $\rightarrow$ `fetchAddressFromCoords()`
* **Primary Objective:** Seamlessly translates raw floating-point GPS coordinates $(lat, lng)$ into human-readable street, tole, chowk, and ward names while safeguarding against external API rate limits.

#### A. Algorithmic Workflow
1. **Event Trigger:** Citizen moves the pin or selects "Pin Current Location".
2. **Debounce Window ($T_{\text{debounce}} = 400\text{ ms}$):** If the citizen continues dragging or panning the marker, existing pending network requests are canceled using `clearTimeout(debounceTimerRef.current)`.
3. **HTTP Query:** Once the marker settles for $> 400\text{ms}$, dispatches a request to OpenStreetMap Nominatim reverse endpoint:
   `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
4. **Resilient Fallback:** If the external reverse-geocoding network fails or times out, the system automatically falls back to raw coordinate string formatting (`Lat: 27.75612, Lng: 85.32541`), guaranteeing form submission is never blocked.

---

### Algorithm 5: Forward Geocoding & Place Autocomplete Search

* **Source Code Location:** `Smart_Civic_Platform_Frontend/src/components/LocationPickerMap.tsx` $\rightarrow$ `handleSearchPlaces()`
* **Primary Objective:** Enables citizens to search for landmarks, chowks, hospitals, or schools within Nepal.
* **Mechanism:**
  - Tokenizes input query.
  - Queries Nominatim search API with country code filtering: `countrycodes=np&limit=5`.
  - When the citizen clicks a result, the map invokes `updateMarker(lat, lng, true, false, false)` which triggers **Algorithm 1 (Ray-Casting)** to verify if the searched landmark falls within municipal boundaries.

---

### Algorithm 6: Spatiotemporal Multi-Modal Near-Duplicate Detection Engine

* **Academic Reference in Report:** Chapter 3, Section 3.3 (Algorithm 1)
* **Source Code Location:** `Smart_Civic_Platform_Backend/src/service/duplicate-detector.service.ts` $\rightarrow$ `evaluateCandidate()`
* **Primary Objective:** Prevents duplicate complaints in department queues. When a citizen places a pin on the map and types a complaint, the system evaluates all open complaints within a spatiotemporal window.

#### A. Multi-Modal Composite Scoring Formula
The match score between candidate complaint $C_{\text{cand}}$ and new complaint $C_{\text{new}}$ is a linear weighted sum of three distinct features:

$$\text{FinalScore} = \min\left(100, \left\lfloor 100 \cdot (w_{\text{geo}} \cdot S_{\text{geo}} + w_{\text{text}} \cdot S_{\text{text}} + S_{\text{category}}) \right\rfloor\right)$$

Where:
* **Spatial Weight:** $w_{\text{geo}} = 0.50$
* **Text Semantic Weight:** $w_{\text{text}} = 0.40$
* **Category Affinity Bonus:** $S_{\text{category}} = 0.12$ (if category IDs match)

#### B. Continuous Piecewise Geospatial Distance Scoring ($S_{\text{geo}}$)
Given distance $d = \text{Haversine}(C_{\text{new}}, C_{\text{cand}})$ in meters:

$$S_{\text{geo}} = \begin{cases} 
1.0 & \text{if } d \le 50\text{ m} \quad \text{(Immediate vicinity / same pothole or valve)} \\
1.0 - \frac{d - 50}{350} & \text{if } 50\text{ m} < d \le 350\text{ m} \quad \text{(Same street or block)} \\
0.4 \cdot \left(1.0 - \frac{d - 350}{400}\right) & \text{if } 350\text{ m} < d \le 750\text{ m} \quad \text{(Perimeter neighborhood)} \\
0.0 & \text{if } d > 750\text{ m}
\end{cases}$$

#### C. Text Semantic Score ($S_{\text{text}}$)
Blends word-level Cosine Similarity, character tri-gram Cosine Similarity (for spelling typos and romanized Nepali transliterations), and Jaccard token overlap:
$$S_{\text{text}} = 0.50 \cdot \text{CosSim}_{\text{words}} + 0.30 \cdot \text{CosSim}_{\text{trigrams}} + 0.20 \cdot \text{Jaccard}_{\text{words}}$$

If $\text{FinalScore} \ge 55\%$, the frontend displays a `DuplicateDetectionCard` allowing the citizen to click **"+1 Upvote (Me Too)"**, subscribing them to updates without generating an identical ticket.

---

## 4. Summary Mapping Table

| Sub-Feature in Map | Computational Algorithm | Implementation File | Mathematical Formula / Principle |
| :--- | :--- | :--- | :--- |
| **Boundary Jurisdiction Verification** | **Ray-Casting Algorithm** | `municipalityBoundaries.ts` | Jordan Curve Theorem ($x_{\text{int}}$ calculation, odd/even intersection parity) |
| **Nearest Municipality Guidance** | **Haversine Distance Formula** | `municipalityBoundaries.ts` | Great-Circle Distance ($R = 6371\text{ km}$, $\text{atan2}$) |
| **Procedural Boundary Generator** | **Trigonometric Radial Distribution** | `municipalityBoundaries.ts` | $\Delta \phi$, $\Delta \lambda / \cos(\phi)$, 8-point regular polygon |
| **Address Auto-Resolution** | **Debounced Reverse Geocoding** | `LocationPickerMap.tsx` | Asynchronous 400ms buffer, Nominatim REST protocol |
| **Landmark Search** | **Bounded Forward Geocoding** | `LocationPickerMap.tsx` | OpenStreetMap Country-Clamped Search (`countrycodes=np`) |
| **Duplicate Grievance Filter** | **Spatiotemporal Composite Scorer** | `duplicate-detector.service.ts` | Piecewise Haversine decay + N-Gram Cosine + Jaccard similarity |

---

## 5. Alignment with Chapter 3 (System Analysis and Design)

In the academic documentation ([`Chapter_3_System_Analysis_and_Design.md`](file:///d:/Smart-Civic-Platform/doc/Chapter_3_System_Analysis_and_Design.md)):
1. **Section 3.1.1 (Use Case UC-02):** References Step 3 (Ray-Casting Ward Resolution) and Step 4 (Spatiotemporal Deduplication within 300m radius).
2. **Section 3.1.4 (Sequence Diagram):** Demonstrates `LocationPickerMap` interacting with the `Geolocation & Deduplication Service` before dispatching `POST /api/citizen/complaints`.
3. **Section 3.1.5 (Activity Diagram):** Outlines the decision branch: *System Deduplication Check $\rightarrow$ Prompt Upvote vs. Ray-Casting Ward Resolution*.
4. **Section 3.3 (Algorithm Details):** Fully expanded in **Algorithm 1 (Deduplication)** and **Algorithm 2 (Ray-Casting)**.
