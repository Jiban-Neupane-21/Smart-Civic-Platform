# Smart Civic Platform: Comprehensive Automation & Algorithms Specification

## 1. Executive Vision & Objectives

The goal of the **Smart Civic Platform** is to bridge the gap between citizens, municipal administrators, and field operational staff through transparent, accountable, and responsive local governance. 

While the platform currently provides solid CRUD workflows for complaint ticketing, KYC verification, and user management, many critical processes still rely heavily on manual human intervention:
- Citizens must manually guess categories, wards, and severity levels.
- Duplicate grievances flood municipal queues when multiple citizens report the same public issue (e.g., water pipe burst, road pothole, fallen electrical pole).
- Department heads must manually assess workloads and assign tickets to individual staff members.
- SLA tracking is purely reactive—warning flags only trigger *after* a breach has already occurred.
- Field workers have no route guidance to visit multiple complaint sites efficiently across a ward.

By embedding targeted, lightweight, and robust **computational algorithms**, the platform can transform into an **autonomous, user-friendly, and proactive civic operating system**.

This document details **8 high-impact algorithms** designed specifically for the Smart Civic Platform's architecture (Node.js/Express backend + React/Vite/MUI frontend + Supabase PostgreSQL).

---

## 2. Algorithms Overview & Architecture Matrix

| # | Algorithm Name | Primary Target Actor | Target Frontend / Backend Touchpoints | Primary User Experience & System Value |
|---|---|---|---|---|
| **1** | **Spatiotemporal Near-Duplicate Complaint Detection & Upvoting** | Citizen, Dept Head | `SubmitComplain.tsx`, `citizen.service.ts` | Eliminates duplicate tickets by 60%+; lets citizens 1-click "+1 Upvote / Me Too" on existing nearby issues. |
| **2** | **Automated Category & Department Routing Classifier** | Citizen, Dept Head | `SubmitComplain.tsx`, `complaint.service.ts` | Automatically suggests the correct municipal department from text, preventing misrouted ticket handoffs. |
| **3** | **Multi-Criteria Workload-Balanced Staff Dispatch Optimization** | Dept Head, Staff | `ComplainDetails.tsx`, `department.service.ts` | 1-click intelligent assignment balancing distance, current active workload, and category specialty. |
| **4** | **Predictive SLA Breach Forecasting & Early Warning Engine** | Dept Head, Munic Head | `Dept_Dashboard.tsx`, `sla.service.ts` | Predicts breach risk *before* deadlines lapse; alerts managers to intervene early. |
| **5** | **Field Staff Inspection Route Optimizer (TSP / 2-Opt Heuristic)** | Field Staff | Staff `Homepage.tsx`, `staff.service.ts` | Generates an ordered daily travel itinerary for staff visiting multiple grievance sites in a ward. |
| **6** | **Point-in-Polygon (Ray-Casting) Ward & Jurisdiction Resolver** | Citizen | `SubmitComplain.tsx` | Auto-detects exact Ward and Municipality from GPS coordinates, eliminating incorrect ward selection. |
| **7** | **Spatial Hotspot & Anomaly Detection (Spatiotemporal DBSCAN)** | Munic Head, SuperAdmin | `ReportAnalytics.tsx`, `analytics.service.ts` | Identifies systemic civic infrastructure failures (e.g., 10 sewage leaks in 500m) for root-cause policy action. |
| **8** | **Resolution Proof Validation & Anti-Fraud Verifier** | Field Staff, Dept Head | Staff `ComplaintDetail.tsx`, `staff.service.ts` | Validates geo-coordinates and photo perceptual hashes to ensure staff physically resolved the issue on-site. |

---

## 3. Detailed Algorithmic Specifications

---

### Algorithm 1: Spatiotemporal Near-Duplicate Complaint Detection & Upvoting

#### A. Civic Problem & UX Friction
When a public issue occurs (e.g., a burst water pipe flooding a street in Ward 4, or a broken streetlight on a major junction), dozens of citizens independently create separate tickets for the same problem. 
- **For Municipalities:** Department queues are clogged with redundant tickets, fragmenting communication and skewing analytics.
- **For Citizens:** Citizens spend 5 minutes filling out forms, only to receive generic duplicate responses or conflicting updates.

#### B. Algorithmic Mechanism
The algorithm combines **Haversine Geodesic Distance** with **TF-IDF Character/Word N-Gram Cosine Similarity** over a sliding time window ($T = 72\text{ hours}$).

```
New Complaint Draft (Lat, Lng, Title, Description, Category)
                             │
                             ▼
              [ Candidate Spatiotemporal Filtering ]
              - Same Municipality & Ward (or Radius <= 300m)
              - Status IN ('pending', 'assigned', 'in_progress')
              - Submitted within the last 72 hours
                             │
                             ▼
              [ Text Semantic Similarity Evaluation ]
              - Preprocess text (tokenization, stopword removal)
              - Compute Term Frequency-Inverse Document Frequency (TF-IDF)
              - Cosine Similarity: CosSim(A, B) = (A · B) / (||A|| * ||B||)
                             │
                             ▼
                 [ Composite Similarity Score ]
           Score = w_geo * (1 - Dist / MaxRadius) + w_text * CosSim
                             │
                             ▼
              Is Composite Score >= Threshold (0.72)?
              ├── YES ──> Trigger "Similar Complaint Detected" UI Card
              └── NO  ──> Proceed as new unique complaint
```

#### C. Mathematical Formulation
1. **Haversine Distance ($d$ in meters):**
   $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
   $$d = 2 R \cdot \arcsin\left(\sqrt{a}\right) \quad (\text{where } R = 6371000\text{ m})$$
   $$\text{GeoSimilarity} = \max\left(0, 1 - \frac{d}{d_{\text{max}}}\right) \quad (d_{\text{max}} = 300\text{m})$$

2. **Text Cosine Similarity:**
   $$\text{TextSimilarity} = \frac{\mathbf{v}_{\text{new}} \cdot \mathbf{v}_{\text{existing}}}{\|\mathbf{v}_{\text{new}}\| \|\mathbf{v}_{\text{existing}}\|}$$

3. **Composite Match Score:**
   $$\text{MatchScore} = 0.55 \cdot \text{GeoSimilarity} + 0.45 \cdot \text{TextSimilarity}$$

#### D. UX Presentation
- As the citizen enters the title or location, a subtle alert pops up:
  > *"📍 2 neighbors near you already reported this: **'Water pipe leakage on Main Road'** (Status: In Progress - Assigned to Water Supply).*  
  > *[Button: **I am also affected (+1 Upvote & Follow)**] [Button: **No, my issue is different**]"*
- If the citizen clicks "+1 Upvote", they are added to the subscriber list of that ticket without filing redundant paperwork, and the existing ticket's priority is elevated.

---

### Algorithm 2: Automated Category & Department Routing Classifier

#### A. Civic Problem & UX Friction
Citizens often do not know municipal organizational structures. For example, does a blocked roadside drain belong to "Sanitation", "Water Supply", or "Public Works / Roads"? 
- Misclassified complaints bounce between departments via manual handoffs (`complaint_handoffs`), delaying resolution by days.

#### B. Algorithmic Mechanism
A **Bayesian Naïve Classifier / Keyword Density Classifier with Domain Synonym Expansion**.

```
Complaint Title + Description
              │
              ▼
   [ Normalization & Stopword Stripping ]
              │
              ▼
   [ Domain Terminology Matching ]
   - Water: [pipe, leak, tap, pani, dhara, drainage, sewage, flood]
   - Electricity: [light, wire, transformer, pole, power, blackout, batti]
   - Sanitation: [garbage, waste, smell, dumping, trash, safai, fohor]
   - Roads/Public Works: [pothole, crack, bridge, footpath, sadak, pitch]
   - Health/Animal: [stray dog, mosquito, dengue, clinic, dead animal]
              │
              ▼
   [ Category Probability Matrix Calculation ]
   P(Dept_k | Text) = P(Dept_k) * ∏ P(Word_i | Dept_k)
              │
              ▼
   Select Dept with max P(Dept_k | Text) + Confidence Score
```

#### C. UX Presentation
- In `SubmitComplain.tsx`, the Department and Category dropdowns are **automatically pre-selected** with an indicator badge:
  `⚡ Auto-Assigned to: Water Supply Department (94% confidence)`.
- The citizen or intake officer can still change it manually with one click.

---

### Algorithm 3: Multi-Criteria Workload-Balanced Staff Dispatch Optimization

#### A. Civic Problem & UX Friction
When a complaint is approved, the Department Head must choose which staff member to dispatch. Currently:
- Popular staff members get overwhelmed with 15 active tickets while others sit idle with 1.
- Staff assigned to Ward 1 are mistakenly dispatched to Ward 8, wasting travel time.

#### B. Algorithmic Mechanism
A **Multi-Factor Weighted Scoring Optimization** function calculated across all active field staff in the department.

$$S(u) = w_{\text{workload}} \cdot f_{\text{load}}(u) + w_{\text{proximity}} \cdot f_{\text{dist}}(u, c) + w_{\text{skill}} \cdot f_{\text{skill}}(u, c) + w_{\text{rating}} \cdot f_{\text{perf}}(u)$$

Where:
1. **Workload Score ($f_{\text{load}}$):**
   $$f_{\text{load}}(u) = \max\left(0, 1 - \frac{\text{ActiveTasks}(u)}{\text{Capacity}_{\text{max}}}\right)$$
2. **Proximity Score ($f_{\text{dist}}$):**
   $$f_{\text{dist}}(u, c) = \begin{cases} 
   1.0 & \text{if staff is assigned to the complaint's ward} \\
   0.6 & \text{if staff is in an adjacent ward} \\
   0.2 & \text{otherwise}
   \end{cases}$$
3. **Category Affinity Score ($f_{\text{skill}}$):**
   Historical ratio of successful resolutions in this specific category:
   $$f_{\text{skill}}(u, c) = \frac{\text{ResolvedCount}(u, \text{category})}{\text{TotalResolved}(u) + 1}$$
4. **Performance Rating ($f_{\text{perf}}$):**
   Normalized citizen feedback rating:
   $$f_{\text{perf}}(u) = \frac{\text{AvgRating}(u)}{5.0}$$

**Default Weights:**
- $w_{\text{workload}} = 0.40$ (Prevents staff burnout and queue stagnation)
- $w_{\text{proximity}} = 0.30$ (Minimizes transit delays)
- $w_{\text{skill}} = 0.15$ (Ensures technical fit)
- $w_{\text{rating}} = 0.15$ (Rewards consistent performance)

#### C. UX Presentation
In the Department Head's Intervention / Dispatch modal:
- A button: **"✨ Auto-Assign Best Staff"** selects the optimal worker instantly.
- Below the dropdown, the top 3 ranked staff members are shown as recommendations:
  - 🥇 **Bikash Thapa** (Score: 92% | Ward 4 Local | 1 Active Task | ⭐ 4.8)
  - 🥈 **Anita Shrestha** (Score: 78% | Ward 4 Local | 3 Active Tasks | ⭐ 4.6)

---

### Algorithm 4: Predictive SLA Breach Forecasting & Early Warning Engine

#### A. Civic Problem & UX Friction
Traditional SLA systems flag complaints only *after* the deadline has already passed (`sla_breached = TRUE`). At that point, the citizen is already frustrated and service level agreements have failed.

#### B. Algorithmic Mechanism
A **Dynamic Risk Scoring & Velocity Decay Function** evaluated periodically by a background task.

$$\text{RiskScore}(c) = \frac{1}{1 + e^{-z}}$$
$$z = \beta_0 + \beta_1 \cdot \left(\frac{t_{\text{elapsed}}}{t_{\text{allowed}}}\right) + \beta_2 \cdot \text{QueueStagnation} + \beta_3 \cdot \text{SeverityWeight} - \beta_4 \cdot \text{DeptResolutionVelocity}$$

Where:
- $\frac{t_{\text{elapsed}}}{t_{\text{allowed}}}$: Ratio of time used (e.g. 0.70 means 70% of SLA time has elapsed).
- $\text{QueueStagnation}$: Time elapsed in current status without any update/transition.
- $\text{DeptResolutionVelocity}$: Average hours this department takes to resolve complaints of this severity.

#### C. Decision Boundaries & Proactive Actions
- **Risk Score < 0.50 (Green - Healthy):** Normal processing.
- **Risk Score 0.50 – 0.75 (Yellow - Watch):** Added to Department Head's *"Approaching SLA Risk"* view.
- **Risk Score > 0.75 (Red - Critical Warning):** Automated high-priority notification to Department Head and assigned Staff:
  > *"⚠️ High Risk: Complaint #KTM-1049 has an 82% probability of SLA breach in 5 hours. Automated escalation will occur if not in progress."*

---

### Algorithm 5: Field Staff Daily Inspection Route Optimizer (TSP / 2-Opt Heuristic)

#### A. Civic Problem & UX Friction
A field technician often has 5 to 10 active field inspection tickets assigned across a municipal ward. Currently, they visit them in random order, backtracking across heavy traffic, wasting fuel and operational hours.

#### B. Algorithmic Mechanism
Solves the **Traveling Salesperson Problem (TSP)** with the staff's current location or municipal office as the starting node ($S_0$) and complaint coordinates as targets ($C_1, C_2, \dots, C_n$).

```
Input: Start Point S_0, List of Complaints {C_1, C_2, ... C_n} with GPS coordinates
                            │
                            ▼
     [ Step 1: Compute Pairwise Distance Matrix D(i, j) ]
     Using Haversine distance between all points
                            │
                            ▼
     [ Step 2: Nearest Neighbor Initial Tour Construction ]
     Greedily pick closest unvisited complaint site
                            │
                            ▼
     [ Step 3: 2-Opt Local Search Edge Improvement ]
     Repeat until no 2-edge swap decreases total tour length:
        If Dist(A, C) + Dist(B, D) < Dist(A, B) + Dist(C, D):
           Reverse sub-route between B and C
                            │
                            ▼
Output: Ordered Sequence of Complaints [C_opt1, C_opt2, ... C_optN] + Route Polyline
```

#### C. UX Presentation
In the Field Staff portal (`staff/Homepage.tsx`):
- A card: **"🗺️ Today's Optimized Inspection Itinerary (6 sites)"**.
- Displays the recommended order:
  1. *Stop 1: Ward 3 Water Valve (1.2 km away - High Priority)*
  2. *Stop 2: Main Bazaar Pipe Leak (0.8 km from Stop 1)*
  3. *Stop 3: School Drainage (1.4 km from Stop 2)*
- Staff can click **"Open in Google Maps / Navigation"** with the entire multi-stop route pre-loaded.

---

### Algorithm 6: Point-in-Polygon (Ray-Casting) Ward & Jurisdiction Resolver

#### A. Civic Problem & UX Friction
Citizens filing complaints frequently choose the wrong ward or even the wrong municipality, causing inter-governmental jurisdiction disputes and rejected tickets.

#### B. Algorithmic Mechanism
The **Jordan Curve Theorem (Ray-Casting Algorithm)** executed against GeoJSON boundary polygons of municipal wards.

```
For a test point P(x, y) = (lng, lat) and polygon vertices V_0, V_1, ... V_k:
Cast a horizontal ray from P to (+infinity, y).
Count number of intersections with polygon edges (V_i, V_{i+1}):
  - Odd intersections  ──> Point is INSIDE the Ward boundary.
  - Even intersections ──> Point is OUTSIDE the Ward boundary.
```

#### C. Mathematical Implementation
For each segment $(y_1, y_2)$ and $(x_1, x_2)$:
$$\text{intersects} \iff ((y_1 > y) \neq (y_2 > y)) \land \left(x < \frac{(x_2 - x_1)(y - y_1)}{y_2 - y_1} + x_1\right)$$

#### D. UX Presentation
- When the citizen clicks **"📍 Use My Current Location"** or pins a location on the map, the Ward and Municipality fields automatically resolve and lock with a verified checkmark:
  `✓ Ward 4, Kathmandu Metropolitan City (Verified via Geo-Fence)`.

---

### Algorithm 7: Spatial Hotspot & Anomaly Detection (Spatiotemporal DBSCAN)

#### A. Civic Problem & UX Friction
Municipal leaders often treat individual complaints in isolation. For example, 15 individual complaints about "low water pressure" or "bad smell" in a 400m zone within 48 hours is not 15 separate routine complaints—it is a major water main contamination or trunk line failure.

#### B. Algorithmic Mechanism
**DBSCAN (Density-Based Spatial Clustering of Applications with Noise)** with temporal decay.

```
Parameters:
  - ε_spatial: Spatial radius (e.g., 350 meters)
  - ε_temporal: Time window (e.g., 48 hours)
  - MinPts: Minimum complaints to form a hotspot cluster (e.g., 5 complaints)

Algorithm Steps:
1. For each complaint C_i in active/recent database:
   Find all neighbors N_eps(C_i) where Dist(C_i, C_j) <= ε_spatial AND |t_i - t_j| <= ε_temporal.
2. If |N_eps(C_i)| >= MinPts:
   Form or expand Cluster K.
3. Classify all connected core points as an Infrastructure Incident Cluster.
4. Calculate Cluster Centroid: Centroid = (mean(lat), mean(lng)).
```

#### C. UX Presentation
In the Municipality Head's **ReportAnalytics.tsx**:
- A real-time **Civic Incident Heatmap**.
- An automated alert banner:
  > *"🚨 Infrastructure Hotspot Detected: 12 complaints in Ward 7 regarding Sewage Overflows within 300m in the last 24 hours.*  
  > *[Button: **Create Joint Emergency Intervention**] [Button: **Send Ward Broadcast Notice**]"*

---

### Algorithm 8: Resolution Proof Validation & Anti-Fraud Verifier

#### A. Civic Problem & UX Friction
A recurring complaint from citizens is that municipal tickets get marked as "Resolved" by field staff, but the pothole is still there or garbage remains uncollected. Staff might upload a generic photo, a close-up that proves nothing, or a photo taken miles away.

#### B. Algorithmic Mechanism
A 3-tier validation pipeline when field staff submits resolution proof:
1. **EXIF Metadata Geo-Fencing:**
   Extracts `GPSLatitude` and `GPSLongitude` from the resolution photo image headers and calculates distance to the complaint site. If distance $> 500\text{m}$, flags for supervisor review.
2. **Perceptual Image Hash (pHash) Comparison:**
   Calculates the 64-bit DCT (Discrete Cosine Transform) perceptual hash of the original complaint photo vs. the resolution photo.
   $$\text{HammingDistance}(\text{Hash}_{\text{orig}}, \text{Hash}_{\text{res}})$$
   - If Hamming Distance $< 5$, the staff accidentally or maliciously re-uploaded the *exact same* photo as the resolution proof!
3. **Image Sharpness / Quality Check (Laplacian Variance):**
   Calculates the variance of the Laplacian filter:
   $$\text{BlurScore} = \text{Var}(\nabla^2 I)$$
   If $\text{BlurScore} < 100$, rejects with: *"Image is too blurry. Please capture a clear photo of the resolved site."*

#### C. UX Presentation
- Protects municipal accountability.
- Increases citizen satisfaction score and eliminates bogus resolutions.

---

## 4. Implementation Phasing Roadmap

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Quick Wins & Citizen UX Automation (Immediate Impact)                           │
│ ─────────────────────────────────────────────────────────────                            │
│ 1. Spatiotemporal Near-Duplicate Complaint Detection & Upvoting (Algorithm 1)             │
│ 2. Automated Category & Department Routing Classifier (Algorithm 2)                     │
│ 3. Point-in-Polygon (Ray-Casting) Ward & Jurisdiction Resolver (Algorithm 6)             │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Operational Efficiency & Dispatch (Administrative Superpowers)                  │
│ ───────────────────────────────────────────────────────────────────────                  │
│ 4. Multi-Criteria Workload-Balanced Staff Dispatch Optimization (Algorithm 3)            │
│ 5. Predictive SLA Breach Forecasting & Early Warning Engine (Algorithm 4)                │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Field Operations & Advanced Civic Intelligence (Smart City Maturity)            │
│ ─────────────────────────────────────────────────────────────────────────────            │
│ 6. Field Staff Inspection Route Optimizer (Algorithm 5)                                  │
│ 7. Spatial Hotspot & Anomaly Detection / DBSCAN (Algorithm 7)                             │
│ 8. Resolution Proof Validation & Anti-Fraud Verifier (Algorithm 8)                       │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Next Steps

1. **Review:** The municipal team reviews this algorithm portfolio.
2. **Prioritization:** Select which phase or specific algorithms to implement first (e.g., Phase 1 for citizen experience or Phase 2 for staff dispatch).
3. **Detailed Execution Plan:** We will generate the step-by-step code implementation plan, database indices, service methods, and UI components for the chosen algorithms.
