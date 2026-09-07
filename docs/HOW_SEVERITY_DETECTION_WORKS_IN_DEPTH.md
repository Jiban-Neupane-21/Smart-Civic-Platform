# In-Depth Guide: How Automated Complaint Severity Detection Works

This document explains in detail how the **Smart Civic Platform** analyzes a citizen's complaint **Title** and **Description** to automatically classify its urgency into **`HIGH`**, **`MEDIUM`**, or **`LOW`**.

---

## 1. Where Does the Code Live?

The algorithm runs in **two places** in your project to ensure a seamless user experience and strict server-side integrity:

1. **Frontend (Real-Time Client-Side Engine)**:
   - File: [`Smart_Civic_Platform_Frontend/src/utils/severityDetector.ts`](file:///d:/Smart-Civic-Platform/Smart_Civic_Platform_Frontend/src/utils/severityDetector.ts)
   - Component: [`Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx`](file:///d:/Smart-Civic-Platform/Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx)
   - **Purpose:** Updates the UI in real time with **0ms latency** as the citizen types each word. Shows detected badge (`🔴 HIGH`, `🟡 MEDIUM`, `🟢 LOW`), matched keywords, and reasoning.

2. **Backend (Server-Side Verification & SLA Engine)**:
   - File: [`Smart_Civic_Platform_Backend/src/service/severity-detector.service.ts`](file:///d:/Smart-Civic-Platform/Smart_Civic_Platform_Backend/src/service/severity-detector.service.ts)
   - Service: [`Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts`](file:///d:/Smart-Civic-Platform/Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts)
   - **Purpose:** Authoritatively verifies the severity upon ticket submission and sets the **SLA Due Date** (`sla_due_at`) in PostgreSQL (`24h` for High, `72h` for Medium, `120h` for Low).

---

## 2. High-Level Flow Diagram

```
       Citizen Inputs
   ┌────────────────────┐
   │ Title              │  e.g. "Live wire sparking on main road"
   │ Description        │  e.g. "Exposed electric wire near school, danger of shock"
   └─────────┬──────────┘
             │
             ▼
   [ Step 1: Text Cleaning / Normalization ]
   - Converts to lowercase: "live wire sparking on main road..."
   - Strips special punctuation (!, @, #, ?, etc.)
   - Preserves single spaces and word boundaries
             │
             ▼
   [ Step 2: Negation Check (3-Word Window) ]
   - Looks for negation words: "no", "not", "without", "never", "dont"
   - Example: "no fire" ──> Ignored! Does NOT trigger High severity
             │
             ▼
   [ Step 3: Multi-Tier Lexicon Scoring ]
   - Scan High Tier   ──> Base: 15 points (Title match gets 1.5x = 22.5 pts)
   - Scan Medium Tier ──> Base:  5 points (Title match gets 1.5x =  7.5 pts)
   - Scan Low Tier    ──> Base:  2 points (Title match gets 1.5x =  3.0 pts)
             │
             ▼
   [ Step 4: Decision Tree & Threshold Evaluation ]
   - If High Score >= 10                ──> Assign "HIGH"   (24h SLA)
   - Else If Medium Score >= 5 or >= Low ──> Assign "MEDIUM" (72h SLA)
   - Else If Low Score >= 3 (and no H/M)──> Assign "LOW"    (120h SLA)
   - Otherwise                          ──> Fallback "MEDIUM" (Standard Civic Baseline)
             │
             ▼
   ┌──────────────────────────────────────────────────────────┐
   │ Output:                                                  │
   │ { severity: 'high', confidence: 'high',                  │
   │   matchedKeywords: ['live wire', 'sparking wire'],       │
   │   reasoning: "Auto-assigned High severity due to..." }   │
   └──────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Code Walkthrough

### Step 1: Text Cleaning (`cleanText`)

Before checking words, the algorithm cleans the text so that capitalization or punctuation does not break matching:

```typescript
function cleanText(text: string): string {
  return text
    .toLowerCase()                     // "Fire!" -> "fire!"
    .replace(/[^\w\s-]/g, ' ')         // "fire!" -> "fire "
    .replace(/\s+/g, ' ')              // Collapses multiple spaces
    .trim();
}
```

- If a citizen writes `"FIRE IN BUILDING!!!"`, it becomes `"fire in building"`.
- If a citizen writes `"Road-crack & pothole?"`, it becomes `"road-crack pothole"`.

---

### Step 2: Intelligent Negation Handling (`isNegated`)

A common flaw in simple keyword matchers is that *"no fire and no casualties"* would trigger High severity because of the words *"fire"* and *"casualties"*. 

To solve this, your system checks **up to 3 words before the detected phrase**:

```typescript
const NEGATION_WORDS = ['no', 'not', 'without', 'never', 'neither', "don't", 'dont', "wasn't", 'wasnt'];

function isNegated(fullText: string, phrase: string): boolean {
  const index = fullText.indexOf(phrase);
  if (index === -1) return false;

  const prefix = fullText.slice(0, index).trim();
  const words = prefix.split(/\s+/);
  const precedingWords = words.slice(-3); // Look at the last 3 words before the phrase

  return precedingWords.some((w) => NEGATION_WORDS.includes(w));
}
```

#### Real Examples:
- `"There is a live wire on the road"`  
  Preceding words: `["a"]` $\to$ **NOT negated** $\to$ Points added!
- `"The wire is dead, there is no live wire"`  
  Preceding words: `["there", "is", "no"]` $\to$ **Negated** (`"no"`) $\to$ **Skipped!**

---

### Step 3: Multi-Tier Weighted Lexicons

The algorithm contains three curated word lists, reflecting municipal reality:

#### Tier 1: High Severity Lexicon (Base: 15 Points each)
Immediate threats to life, physical safety, or catastrophic structural collapse:
- **Emergencies:** `emergency`, `critical`, `urgent`, `immediate`, `crisis`, `catastrophe`, `life-threatening`, `severe accident`
- **Fire & Electricity:** `fire`, `flames`, `explosion`, `blast`, `live wire`, `sparking wire`, `exposed wire`, `electric shock`, `gas leak`
- **Structural Catastrophes:** `collapse`, `collapsed`, `landslide`, `flood`, `flooding`, `sinkhole`, `bridge collapse`, `building crack`, `dam burst`
- **Casualties & Health:** `fatal`, `death`, `deadly`, `casualty`, `injured`, `injury`, `toxic`, `poison`, `chemical spill`, `contamination`
- **Nepali / Romanized Terms:** `aago` (fire), `pahiro` (landslide), `baadhi` (flood), `khatra` (danger), `durghatana` (accident), `aakasmik` (emergency)

#### Tier 2: Medium Severity Lexicon (Base: 5 Points each)
Public infrastructure disruptions, utility shortages, sanitation hazards:
- **Water & Drainage:** `burst pipe`, `pipe burst`, `water leak`, `pipe leak`, `sewage`, `drainage`, `overflow`, `blocked drain`, `clogged`, `no water`, `water shortage`
- **Road Obstructions:** `pothole`, `potholes`, `road damage`, `crack`, `open manhole`, `manhole cover`, `fallen pole`, `fallen tree`, `street light`, `traffic jam`, `road block`
- **Electricity Outages:** `power outage`, `blackout`, `electricity cut`, `power cut`, `transformer issue`
- **Sanitation Nuisance:** `garbage pile`, `waste overflow`, `uncollected trash`, `foul smell`, `stench`, `dead animal`, `mosquito breeding`

#### Tier 3: Low Severity Lexicon (Base: 2 Points each)
Routine aesthetic upkeep, general citizen inquiries, cosmetic improvements:
- **Cleaning & Landscape:** `cleaning`, `sweeping`, `dust`, `noise`, `tree branch`, `overgrown grass`, `bush trimming`, `grass cutting`
- **Cosmetic / Furniture:** `faded paint`, `peeling paint`, `graffiti`, `park bench`, `signboard`, `street painting`, `broken bench`
- **Requests & Inquiries:** `inquiry`, `suggestion`, `feedback`, `general request`, `information`, `minor`, `slow service`, `cosmetic`, `stray dog barking`

---

### Step 4: Title Weight Multiplier ($1.5\times$)

When citizens write the **Title**, they summarize the core problem. A keyword in the title is more intentional than an incidental mention in a long description.

```typescript
let points = 15; // or 5 or 2
if (cleanTitle.includes(phrase)) {
  points *= 1.5; // Title multiplier: 15 -> 22.5, 5 -> 7.5, 2 -> 3.0
}
```

---

### Step 5: Decision Resolution & Threshold Rules

Once the scores are tallied, the algorithm follows a strict priority order:

```typescript
// Rule 1: Any High Severity trigger >= 10 points
if (highScore >= 10) {
  severity = 'high';   // 24h SLA
}
// Rule 2: Medium Severity trigger >= 5 points OR exceeds Low
else if (mediumScore >= 5 || (mediumScore > 0 && mediumScore >= lowScore)) {
  severity = 'medium'; // 72h SLA
}
// Rule 3: Pure Low Severity (Must have NO High and NO Medium signals)
else if (lowScore >= 3 && highScore === 0 && mediumScore === 0) {
  severity = 'low';    // 120h SLA
}
// Rule 4: Default Civic Baseline
else {
  severity = 'medium'; // Standard municipal baseline
}
```

> **Why is the default fallback `medium`?**  
> In municipal governance, under-classifying an unparsed citizen complaint as `low` causes neglected SLAs (5 days), while over-classifying as `high` floods emergency teams. `medium` (3 days) is the internationally accepted standard baseline for public grievance systems.

---

## 4. Real-World Case Studies & Calculation Walkthroughs

### Case 1: High Urgency Electrical Threat

* **Citizen Input:**
  * **Title:** `"Live wire sparking on road"`
  * **Description:** `"A live electrical wire fell down after rain near the school gate, severe danger of electric shock."`
* **Score Calculation:**
  * Keyword `"live wire"`:
    * In High Lexicon (Base = 15 pts)
    * Found in Title $\implies 15 \times 1.5 = 22.5$ pts
  * Keyword `"sparking wire"`:
    * Not found as exact phrase, but `"electric shock"` found in Description $\implies 15$ pts
  * Total High Score $= 22.5 + 15 = 37.5$ pts
* **Decision:**
  * $37.5 \ge 10 \implies$ **`HIGH`**
  * Confidence: `high` ($\ge 25$)
  * SLA: **24 Hours Target**
  * UI Display: `🔴 HIGH (24h SLA Target) | Auto-Assigned High severity due to: 'live wire', 'electric shock'`

---

### Case 2: Public Infrastructure Disruption (Water Leak)

* **Citizen Input:**
  * **Title:** `"Drinking water pipe leakage"`
  * **Description:** `"Water pipe burst under the pavement, clean water is flowing on the road for 2 days."`
* **Score Calculation:**
  * Keyword `"water leak"`:
    * In Medium Lexicon (Base = 5 pts)
    * Found in Title $\implies 5 \times 1.5 = 7.5$ pts
  * Keyword `"burst pipe"` / `"pipe burst"`:
    * Found in Description $\implies 5$ pts
  * Total Medium Score $= 7.5 + 5 = 12.5$ pts
  * High Score $= 0$
* **Decision:**
  * High Score $< 10$
  * Medium Score $12.5 \ge 5 \implies$ **`MEDIUM`**
  * SLA: **72 Hours Target**
  * UI Display: `🟡 MEDIUM (72h SLA Target) | Auto-Assigned Medium severity based on: 'water leak', 'pipe burst'`

---

### Case 3: Routine Maintenance / Aesthetic Request

* **Citizen Input:**
  * **Title:** `"Park bench paint peeling"`
  * **Description:** `"The wooden benches in the community park have faded paint and graffiti, please send a painter for cleaning."`
* **Score Calculation:**
  * Keyword `"peeling paint"`:
    * In Low Lexicon (Base = 2 pts)
    * Found in Title $\implies 2 \times 1.5 = 3.0$ pts
  * Keyword `"faded paint"`: Found in Description $\implies 2$ pts
  * Keyword `"graffiti"`: Found in Description $\implies 2$ pts
  * Keyword `"cleaning"`: Found in Description $\implies 2$ pts
  * Total Low Score $= 3 + 2 + 2 + 2 = 9.0$ pts
  * High Score $= 0$, Medium Score $= 0$
* **Decision:**
  * High $= 0$, Medium $= 0$, Low $= 9.0 \ge 3 \implies$ **`LOW`**
  * SLA: **120 Hours (5 Days) Target**
  * UI Display: `🟢 LOW (120h SLA Target) | Auto-Assigned Low severity based on: 'peeling paint', 'faded paint', 'graffiti'`

---

### Case 4: Negated Phrase Protection

* **Citizen Input:**
  * **Title:** `"Pothole on street"`
  * **Description:** `"There is a pothole near the store. There is no fire and no accident, but vehicles get stuck."`
* **Score Calculation:**
  * Keyword `"pothole"` (Medium): Found in Title $\implies 5 \times 1.5 = 7.5$ pts
  * Keyword `"fire"` (High): Preceded by `"no"` $\implies$ **Skipped!** ($0$ pts)
  * Keyword `"accident"` (High): Preceded by `"no"` $\implies$ **Skipped!** ($0$ pts)
  * High Score $= 0$, Medium Score $= 7.5$
* **Decision:**
  * Did NOT falsely trigger High severity!
  * Evaluates cleanly to **`MEDIUM`**.

---

## 5. Summary Table: Severity vs SLA vs Impact

| Severity Level | Point Thresholds | Municipal SLA Target | Typical Triggers |
|---|---|---|---|
| 🔴 **HIGH** | `highScore >= 10` | **24 Hours** | Live wires, fire, landslides, floods, gas leaks, structural collapse, injuries. |
| 🟡 **MEDIUM** | `mediumScore >= 5` or fallback | **72 Hours** (3 Days) | Water leaks, burst pipes, potholes, blocked drains, overflowing garbage, blackouts. |
| 🟢 **LOW** | `lowScore >= 3` *(no High/Med)* | **120 Hours** (5 Days) | Faded paint, sweeping, park bench repairs, grass cutting, suggestions/inquiries. |

---

## 6. Citizen Flexibility: The "Manual Override" Feature

Even though the algorithm is highly accurate, democratic municipal software must never take away citizen agency. 

In `SubmitComplain.tsx`:
- The card shows `⚡ Auto-Detected` by default.
- If a citizen feels their specific circumstance is more urgent, they can click **"Change Manually"**.
- Clicking this opens manual buttons (`Low`, `Medium`, `High`) while keeping the automated recommendation visible.
- If they change their mind, clicking **"Reset to Auto-Detection"** instantly re-engages the algorithmic detection.
