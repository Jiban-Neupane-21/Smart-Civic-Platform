# Automated Complaint Severity Detection Algorithm Specification

## 1. Executive Summary

In public grievance management, accurately categorizing complaint urgency is vital for municipal operations and SLA compliance. When citizens are asked to choose severity levels manually, reports are frequently misclassified—either over-escalating non-urgent issues or failing to flag emergency situations.

This specification describes the **Weighted N-Gram & Negation-Aware Rule-Based Classifier** designed for the Smart Civic Platform. The algorithm automatically determines the severity level (`low`, `medium`, or `high`) in real time from the complaint's title and description.

---

## 2. Architecture & Pipeline

```
Raw Input Text (Title + Description)
                 │
                 ▼
     [ Step 1: Normalization ]
     - Lowercase conversion
     - Punctuation & whitespace normalization
                 │
                 ▼
     [ Step 2: N-Gram Extraction ]
     - Unigrams (e.g., "fire", "danger")
     - Bigrams & Trigrams (e.g., "live wire", "burst pipe", "gas leak")
                 │
                 ▼
     [ Step 3: Negation Scope Detection ]
     - Detects negation anchors ("no", "not", "without", "never")
     - Applies a forward 3-token suppression window
                 │
                 ▼
     [ Step 4: Multi-Tier Lexicon Scoring ]
     - Critical/Emergency Tier (Score: 10–25)
     - Moderate/Disruption Tier (Score: 4–8)
     - Minor/Routine Tier (Score: 1–3)
     - Title Multiplier (1.5x)
                 │
                 ▼
     [ Step 5: Threshold Decision & SLA Resolution ]
     - Score >= High_Threshold   ──> "high"   (24h SLA)
     - Score >= Medium_Threshold ──> "medium" (72h SLA)
     - Score >= Low_Threshold    ──> "low"    (120h SLA)
                 │
                 ▼
Output: { severity, confidence, matchedKeywords, reasoning }
```

---

## 3. Detailed Algorithmic Steps

### Step 1: Text Normalization
- All characters are converted to lowercase.
- Special punctuation marks are stripped, preserving word boundaries and spaces.
- Common contractions are expanded.

### Step 2: N-Gram Tokenization
Single words (unigrams) and multi-word phrases (bigrams/trigrams) are extracted:
- **Bigrams/Trigrams**: Critical compounds such as `live wire`, `open manhole`, `gas leak`, `water supply cut`, `building collapse` are evaluated as cohesive entities.

### Step 3: Negation Scope Detection
To prevent false alarms (e.g., *"There is no danger"* or *"The pipe is not broken"*), a negation window scanner looks for negation tokens:
- **Negation triggers**: `["no", "not", "without", "never", "no immediate", "neither"]`.
- **Window size**: 3 following tokens. Any keyword appearing within this window has its score neutralized or inverted.

### Step 4: Multi-Tier Lexicon and Weights

#### Tier 1: 🔴 High / Critical (Urgent — 24 Hour SLA)
Focuses on imminent danger to life, acute public hazards, disasters, and severe structural failures.
- **Keywords**:
  - *Emergency*: `emergency`, `critical`, `urgent`, `immediately`, `catastrophe`, `crisis`, `acute`, `life-threatening`.
  - *Fire & Electrical*: `fire`, `flames`, `explosion`, `live wire`, `sparking wire`, `electric shock`, `electrocuted`, `gas leak`.
  - *Structural & Natural Hazards*: `collapse`, `collapsed`, `landslide`, `flood`, `sinkhole`, `bridge collapse`, `deep sinkhole`, `dam burst`.
  - *Health & Physical Safety*: `fatal`, `casualty`, `death`, `injured`, `injury`, `bleeding`, `toxic`, `chemical spill`, `contamination`, `poison`, `assault`, `violence`.
  - *Localized / Romanized Nepali Terms*: `aago`, `pahiro`, `baadhi`, `khatra`, `durghatana`, `aakasmik`.
- **Base Weight**: 15 points per match.

#### Tier 2: 🟡 Medium / Standard (Disruption — 72 Hour SLA)
Focuses on public utility breakdowns, road infrastructure failures, sanitary nuisances, and standard civic grievances.
- **Keywords**:
  - *Water & Drainage*: `burst pipe`, `water leak`, `pipe leak`, `sewage`, `drainage`, `overflow`, `blocked drain`, `clogged`, `flooding lane`, `no water`, `water shortage`.
  - *Roads & Transport*: `pothole`, `road damage`, `crack`, `pavement broken`, `fallen pole`, `street light`, `traffic jam`, `road block`, `open manhole`.
  - *Power & Utilities*: `power outage`, `blackout`, `electricity cut`, `transformer issue`.
  - *Sanitation & Waste*: `garbage pile`, `waste overflow`, `foul smell`, `stench`, `uncollected trash`, `dead animal`.
- **Base Weight**: 5 points per match.

#### Tier 3: 🟢 Low / Routine (Aesthetic & Informational — 120 Hour SLA)
Focuses on cosmetic issues, parks and gardening, general suggestions, and non-disruptive requests.
- **Keywords**:
  - *Cosmetic & Maintenance*: `cleaning`, `sweeping`, `dust`, `noise`, `tree branch`, `overgrown grass`, `bush trimming`, `faded paint`, `graffiti`, `park bench`, `signboard faded`.
  - *Inquiries & Feedback*: `inquiry`, `suggestion`, `feedback`, `general request`, `information`, `minor`, `stray dog barking`.
- **Base Weight**: 2 points per match.

### Step 5: Title Multiplier & Thresholding
- **Title Multiplier**: Keywords matched within the complaint `title` receive a **1.5x multiplier**, reflecting the primary topic defined by the user.
- **Decision Logic**:
  1. If `net_high_score >= 10` $\rightarrow$ Severity is **`high`**.
  2. Else if `net_medium_score >= 5` $\rightarrow$ Severity is **`medium`**.
  3. Else if `net_low_score >= 3` and `net_high_score == 0` $\rightarrow$ Severity is **`low`**.
  4. Default baseline $\rightarrow$ **`medium`** (standard municipal baseline).

---

## 4. Input / Output Data Model

### Output Interface (`SeverityAnalysisResult`)
```typescript
export interface SeverityAnalysisResult {
  severity: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  score: {
    high: number;
    medium: number;
    low: number;
  };
  matchedKeywords: string[];
  reasoning: string;
}
```

### Example 1: Critical Emergency
- **Title**: `"Live electric wire fallen on road"`
- **Description**: `"There is a live wire broken and sparking near the primary school. It is an immediate danger to children."`
- **Output**:
  ```json
  {
    "severity": "high",
    "confidence": "high",
    "score": { "high": 37.5, "medium": 5, "low": 0 },
    "matchedKeywords": ["live wire", "sparking", "danger", "broken"],
    "reasoning": "Detected critical safety hazard: 'live wire', 'sparking', 'danger'"
  }
  ```

### Example 2: Routine Disruption
- **Title**: `"Drainage overflow near ward office"`
- **Description**: `"The drain is blocked with mud and sewage water is overflowing onto the street."`
- **Output**:
  ```json
  {
    "severity": "medium",
    "confidence": "high",
    "score": { "high": 0, "medium": 15, "low": 0 },
    "matchedKeywords": ["drainage", "blocked drain", "overflow", "sewage"],
    "reasoning": "Detected standard civic disruption: 'drainage', 'blocked drain', 'overflow', 'sewage'"
  }
  ```

---

## 5. Implementation Locations

1. **Frontend Utility**: `Smart_Civic_Platform_Frontend/src/utils/severityDetector.ts`
   - Executes with 0ms latency in the citizen submission view ([SubmitComplain.tsx](file:///d:/Smart-Civic-Platform/Smart_Civic_Platform_Frontend/src/pages/citizen/SubmitComplain.tsx)).
   - Updates as the citizen types the title or description.
2. **Backend Service**: `Smart_Civic_Platform_Backend/src/service/severity-detector.service.ts`
   - Evaluates complaints upon API submission in [citizen.service.ts](file:///d:/Smart-Civic-Platform/Smart_Civic_Platform_Backend/src/modules/citizen/services/citizen.service.ts).
   - Guarantees server-enforced SLA due date calculations.
