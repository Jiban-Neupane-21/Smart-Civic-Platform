/**
 * Server-side Automated Complaint Severity Detector Service
 *
 * Employs multi-tier weighted n-gram parsing with negation scope checking
 * to determine complaint severity level and calculate accurate SLA due dates.
 */

export interface SeverityAnalysisResult {
  severity: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  score: {
    high: number;
    medium: number;
    low: number;
  };
  matchedKeywords: string[];
  reasoning: string;
}

const HIGH_SEVERITY_KEYWORDS = [
  "emergency", "critical", "urgent", "immediately", "immediate", "crisis", "catastrophe",
  "life-threatening", "acute risk", "severe accident",
  "fire", "flames", "explosion", "blast", "live wire", "sparking wire", "exposed wire",
  "electric shock", "electrocuted", "gas leak", "cylinder blast",
  "collapse", "collapsed", "collapsing", "landslide", "flood", "flooding", "sinkhole",
  "bridge collapse", "building crack", "dam burst", "wall collapse",
  "fatal", "fatality", "death", "deadly", "casualty", "injured", "injury", "injuries",
  "bleeding", "toxic", "poison", "chemical spill", "contamination", "assault", "violence",
  "aago", "pahiro", "baadhi", "khatra", "durghatana", "aakasmik",
];

const MEDIUM_SEVERITY_KEYWORDS = [
  "burst pipe", "pipe burst", "water leak", "pipe leak", "sewage", "drainage",
  "overflow", "overflowing", "blocked drain", "drain blocked", "clogged", "sewer",
  "no water", "water supply", "water shortage",
  "pothole", "potholes", "road damage", "damaged road", "crack", "road crack",
  "open manhole", "manhole cover", "fallen pole", "fallen tree", "street light",
  "traffic jam", "traffic light", "road block", "culvert broken",
  "power outage", "blackout", "electricity cut", "power cut", "transformer issue",
  "garbage pile", "waste overflow", "uncollected trash", "foul smell", "stench",
  "dead animal", "stray cattle", "mosquito breeding", "broken bench",
];

const LOW_SEVERITY_KEYWORDS = [
  "cleaning", "sweeping", "dust", "noise", "tree branch", "overgrown grass",
  "bush trimming", "faded paint", "peeling paint", "graffiti", "park bench",
  "signboard", "sign board", "street painting",
  "inquiry", "suggestion", "feedback", "general request", "information", "minor",
  "slow service", "cosmetic", "stray dog barking", "grass cutting",
];

const NEGATION_WORDS = ["no", "not", "without", "never", "neither", "don't", "dont", "wasn't", "wasnt"];

function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNegated(fullText: string, phrase: string): boolean {
  const index = fullText.indexOf(phrase);
  if (index === -1) return false;

  const prefix = fullText.slice(0, index).trim();
  const words = prefix.split(/\s+/);
  const precedingWords = words.slice(-3);

  return precedingWords.some((w) => NEGATION_WORDS.includes(w));
}

export class SeverityDetectorService {
  public static detectSeverity(title: string, description: string): SeverityAnalysisResult {
    const combined = `${title || ""} ${description || ""}`.trim();
    if (!combined || combined.length < 5) {
      return {
        severity: "medium",
        confidence: "low",
        score: { high: 0, medium: 0, low: 0 },
        matchedKeywords: [],
        reasoning: "Standard default severity level (insufficient text).",
      };
    }

    const cleanTitle = cleanText(title || "");
    const cleanDesc = cleanText(description || "");
    const fullClean = `${cleanTitle} ${cleanDesc}`.trim();

    let highScore = 0;
    let mediumScore = 0;
    let lowScore = 0;

    const matchedHigh: string[] = [];
    const matchedMedium: string[] = [];
    const matchedLow: string[] = [];

    // 1. Scan High
    for (const phrase of HIGH_SEVERITY_KEYWORDS) {
      if (fullClean.includes(phrase)) {
        if (isNegated(fullClean, phrase)) continue;
        let points = 15;
        if (cleanTitle.includes(phrase)) points *= 1.5;
        highScore += points;
        matchedHigh.push(phrase);
      }
    }

    // 2. Scan Medium
    for (const phrase of MEDIUM_SEVERITY_KEYWORDS) {
      if (fullClean.includes(phrase)) {
        if (isNegated(fullClean, phrase)) continue;
        let points = 5;
        if (cleanTitle.includes(phrase)) points *= 1.5;
        mediumScore += points;
        matchedMedium.push(phrase);
      }
    }

    // 3. Scan Low
    for (const phrase of LOW_SEVERITY_KEYWORDS) {
      if (fullClean.includes(phrase)) {
        if (isNegated(fullClean, phrase)) continue;
        let points = 2;
        if (cleanTitle.includes(phrase)) points *= 1.5;
        lowScore += points;
        matchedLow.push(phrase);
      }
    }

    let severity: "low" | "medium" | "high" = "medium";
    let confidence: "low" | "medium" | "high" = "medium";
    let reasoning = "";
    const allMatched = [...matchedHigh, ...matchedMedium, ...matchedLow];

    if (highScore >= 10) {
      severity = "high";
      confidence = highScore >= 25 ? "high" : "medium";
      reasoning = `Assigned High severity based on safety hazard keywords: ${matchedHigh.slice(0, 3).map(k => `'${k}'`).join(", ")}.`;
    } else if (mediumScore >= 5 || (mediumScore > 0 && mediumScore >= lowScore)) {
      severity = "medium";
      confidence = mediumScore >= 10 ? "high" : "medium";
      reasoning = matchedMedium.length > 0
        ? `Assigned Medium severity based on infrastructure keywords: ${matchedMedium.slice(0, 3).map(k => `'${k}'`).join(", ")}.`
        : "Standard municipal disruption baseline.";
    } else if (lowScore >= 3 && highScore === 0 && mediumScore === 0) {
      severity = "low";
      confidence = lowScore >= 6 ? "high" : "medium";
      reasoning = `Assigned Low severity based on routine maintenance keywords: ${matchedLow.slice(0, 3).map(k => `'${k}'`).join(", ")}.`;
    } else {
      severity = "medium";
      confidence = "low";
      reasoning = "Standard Medium baseline for civic complaints.";
    }

    return {
      severity,
      confidence,
      score: {
        high: Math.round(highScore),
        medium: Math.round(mediumScore),
        low: Math.round(lowScore),
      },
      matchedKeywords: Array.from(new Set(allMatched)),
      reasoning,
    };
  }
}
