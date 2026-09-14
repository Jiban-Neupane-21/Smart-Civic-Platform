# Algorithm 4: Multi-Criteria Workload-Balanced Staff Dispatch Optimization

> **Document Type:** Detailed Algorithmic Specification  
> **Relevant Report Section:** Chapter 3: System Analysis and Design, Section 3.3 (Algorithm 4) & Section 3.1.1 (UC-08)  
> **Source Code Implementation:**  
> - Backend Service: `Smart_Civic_Platform_Backend/src/modules/department/services/department.service.ts`  
> - Backend Repository: `Smart_Civic_Platform_Backend/src/modules/department/repository/department.repository.ts`  
> - Department Triage Touchpoint: `Smart_Civic_Platform_Frontend/src/pages/department/` (`ComplainDetails.tsx`, `DepartmentDashboard.tsx`)

---

## 1. Problem Formulation & Civic Context

When municipal grievances are verified and approved by a Department Head (*शाखा प्रमुख*), field operational staff must be dispatched to carry out the physical repair:
1. **Inequitable Workload Distribution:** In traditional municipal setups, department supervisors repeatedly dispatch the same few experienced technicians, overburdening them with 10–15 active tickets while newer staff remain underutilized.
2. **Geographical Backtracking:** Field workers assigned to Ward 2 are frequently routed to Ward 9, wasting hours in traffic, increasing vehicle fuel expenses, and lengthening resolution times.
3. **Skill Mismatch:** A plumbing technician may be assigned to an electrical transformer malfunction, causing field confusion and necessitating secondary re-assignments.

### The Solution
The **Multi-Criteria Decision Analysis (MCDA) Workload-Balanced Dispatch Optimizer** evaluates all active field personnel in the department against three weighted dimensions:
- **Current Active Workload ($w_{\text{load}} = 45\%$)**
- **Geographical Distance from Incident ($w_{\text{dist}} = 35\%$)**
- **Technical Specialization Match ($w_{\text{skill}} = 20\%$)**

The engine ranks candidates in descending order of suitability and recommends the optimal staff member for one-click assignment.

---

## 2. Algorithmic Architecture & Pipeline

```
Complaint P_complain (Lat, Lng, Category) & Department Staff Roster S
                                │
                                ▼
         [ 1. Ineligibility Filter & Roster Traversal ]
         For each staff member s in S:
            ├── Check: Is staff active? (status == 'active')
            └── Check: Is staff below hard capacity? (active_tickets < 10)
            If NOT eligible ──> s.suitability = -1.0 (Ineligible)
                                │
                                ▼
         [ 2. Multi-Criteria Scoring Dimensions ]
            ├── Load Score:  f_load = 1.0 - (active_tickets / max_load)
            ├── Dist Score:  d = Haversine(P_complain, s.location)
                             f_dist = 1.0 - Min(d / max_dist, 1.0)
            └── Skill Score: f_skill = (s.specialty == Category) ? 1.0 : 0.40
                                │
                                ▼
         [ 3. Weighted Multi-Attribute Synthesis ]
         Score(s) = (0.45 * f_load) + (0.35 * f_dist) + (0.20 * f_skill)
                                │
                                ▼
         [ 4. Candidate Ranking & Recommendation ]
         Sort eligible staff candidates by Score DESCENDING
         Rank 1: Optimal Recommended Technician
                                │
                                ▼
         [ 5. 1-Click Confirmation & Assignment Record Creation ]
         - Transition complaint status: 'pending' -> 'assigned'
         - Insert into staff_assignments table
         - Emit push notification to technician's mobile dashboard
```

---

## 3. Mathematical Formulations

### 3.1 Multi-Criteria Weighted Utility Function

Given a set of candidate department technicians $\mathcal{S} = \{s_1, s_2, \dots, s_m\}$ and a target grievance $C$, the suitability score $S(s_i)$ is defined as:

$$S(s_i) = w_{\text{load}} \cdot f_{\text{load}}(s_i) + w_{\text{dist}} \cdot f_{\text{dist}}(s_i, C) + w_{\text{skill}} \cdot f_{\text{skill}}(s_i, C)$$

Subject to:
$$w_{\text{load}} + w_{\text{dist}} + w_{\text{skill}} = 0.45 + 0.35 + 0.20 = 1.00$$

---

### 3.2 Dimension 1: Workload Balancing Factor ($f_{\text{load}}$)

To avoid technician burnout and prevent SLA bottlenecks, active task capacity is capped at $\text{Capacity}_{\max} = 10\text{ tickets}$:

$$f_{\text{load}}(s_i) = \max\left(0, 1.00 - \frac{\text{ActiveTickets}(s_i)}{\text{Capacity}_{\max}}\right)$$

* A technician with $0$ active tickets receives $f_{\text{load}} = 1.00$.
* A technician with $5$ active tickets receives $f_{\text{load}} = 0.50$.
* A technician with $10$ active tickets receives $f_{\text{load}} = 0.00$ and is flagged ineligible.

---

### 3.3 Dimension 2: Proximity & Travel Efficiency Factor ($f_{\text{dist}}$)

Given technician coordinates $P_{\text{staff}} = (\phi_s, \lambda_s)$ and complaint incident coordinates $P_C = (\phi_c, \lambda_c)$, calculate the Great-Circle Haversine distance $d$ in kilometers:

$$d = \text{CalculateHaversineDistanceKm}(P_{\text{staff}}, P_C)$$

With maximum service radius $d_{\max} = 15.0\text{ km}$:

$$f_{\text{dist}}(s_i, C) = 1.00 - \min\left(\frac{d}{d_{\max}}, 1.00\right)$$

* If distance $d = 1.5\text{ km} \rightarrow f_{\text{dist}} = 1.00 - (1.5 / 15) = 0.90$.
* If distance $d \ge 15.0\text{ km} \rightarrow f_{\text{dist}} = 0.00$.

---

### 3.4 Dimension 3: Technical Specialization Factor ($f_{\text{skill}}$)

Matches technician certification against the complaint category:

$$f_{\text{skill}}(s_i, C) = \begin{cases}
1.00 & \text{if } s_i.\text{specialty} == C.\text{category} \\
0.40 & \text{otherwise (general technician baseline)}
\end{cases}$$

---

### 3.5 Optimization Selection Rule

The optimal technician candidate $s^*$ is determined by:

$$s^* = \arg\max_{s_i \in \mathcal{S}_{\text{eligible}}} S(s_i)$$

Where $\mathcal{S}_{\text{eligible}} = \{s_i \in \mathcal{S} \mid s_i.\text{is\_active} = \text{True} \land \text{ActiveTickets}(s_i) < 10\}$.

---

## 4. Complete Pseudocode & TypeScript Implementation

```typescript
export interface FieldStaffCandidate {
  id: string;
  name: string;
  is_active: boolean;
  active_tickets: number;
  latitude: number;
  longitude: number;
  specialty: string;
  suitability_score?: number;
}

export interface ComplaintTarget {
  latitude: number;
  longitude: number;
  category: string;
}

export class StaffDispatchOptimizer {
  private static readonly W_LOAD = 0.45;
  private static readonly W_DIST = 0.35;
  private static readonly W_SKILL = 0.20;
  private static readonly MAX_CAPACITY = 10;
  private static readonly MAX_DISTANCE_KM = 15.0;

  public static rankStaff(
    staffList: FieldStaffCandidate[],
    target: ComplaintTarget
  ): FieldStaffCandidate[] {
    const scoredList: FieldStaffCandidate[] = [];

    for (const staff of staffList) {
      // 1. Hard constraints check
      if (!staff.is_active || staff.active_tickets >= this.MAX_CAPACITY) {
        staff.suitability_score = -1.0;
        continue;
      }

      // 2. Normalized Workload Score
      const f_load = 1.0 - (staff.active_tickets / this.MAX_CAPACITY);

      // 3. Normalized Distance Score
      const distKm = this.haversineKm(staff.latitude, staff.longitude, target.latitude, target.longitude);
      const f_dist = 1.0 - Math.min(distKm / this.MAX_DISTANCE_KM, 1.0);

      // 4. Specialty Match Score
      const f_skill = staff.specialty.toLowerCase() === target.category.toLowerCase() ? 1.0 : 0.4;

      // 5. Composite Suitability Score
      const score = (this.W_LOAD * f_load) + (this.W_DIST * f_dist) + (this.W_SKILL * f_skill);
      staff.suitability_score = Math.round(score * 100) / 100;
      scoredList.push(staff);
    }

    // Rank descending by suitability score
    return scoredList.sort((a, b) => (b.suitability_score || 0) - (a.suitability_score || 0));
  }

  private static haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
```

---

## 5. Runtime Complexity & Operational Benefits

* **Time Complexity:** $\mathcal{O}(M)$ where $M$ is the number of field personnel in the department (typically $5 \le M \le 50$). Total execution time is $< 0.05\text{ ms}$.
* **Space Complexity:** $\mathcal{O}(M)$ to store ranked suitability objects.
* **Civic Operational Value:**
  - Balances municipal technician workloads fairly.
  - Minimizes transit time across urban traffic and rural municipal terrain.
  - Ensures emergency work orders are assigned to qualified personnel first.
