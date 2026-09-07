/**
 * Spatiotemporal Near-Duplicate Complaint Detection Service
 *
 * Combines Haversine Geodesic Distance, N-gram Cosine Similarity,
 * Jaccard Token Overlap, and Category Affinity to detect duplicate grievances.
 */

export interface DuplicateCheckCandidate {
  co_uid: string;
  tracking_id: string;
  title: string;
  description: string;
  category_id?: string;
  category_name?: string;
  department_name?: string;
  status: string;
  severity_level?: string;
  priority?: string;
  latitude?: number | null;
  longitude?: number | null;
  ward_number?: number | null;
  upvote_count?: number;
  submitted_date: string;
}

export interface DuplicateCheckInput {
  title: string;
  description?: string;
  category_id?: string;
  municipality_id: string;
  ward_number?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DuplicateMatchResult {
  complaint: {
    co_uid: string;
    tracking_id: string;
    title: string;
    description: string;
    category_name?: string;
    department_name?: string;
    status: string;
    severity_level?: string;
    priority?: string;
    ward_number?: number | null;
    upvote_count: number;
    submitted_date: string;
  };
  similarity_score: number; // 0 to 100
  confidence_level: "high" | "medium";
  distance_meters: number | null;
  distance_label: string;
  reasons: string[];
}

const STOPWORDS = new Set([
  // English
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "from",
  "and", "or", "but", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "this", "that", "these", "those",
  "it", "its", "my", "our", "your", "their", "here", "there", "where", "when",
  "please", "kindly", "problem", "issue", "complaint", "help", "need", "urgent",
  // Romanized Nepali
  "ko", "ma", "cha", "chha", "chhan", "bata", "bhayeko", "bhayo", "huncha",
  "hune", "le", "lai", "pani", "yo", "tyo", "mero", "hamro", "thau", "thauko",
  "kura", "kasto", "garne", "garnus", "garnuhos", "bato", "sadak", "gali"
]);

export class DuplicateDetectorService {
  /**
   * Calculate Haversine distance in meters between two lat/lon points
   */
  public static haversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Tokenize text into normalized unique words and character tri-grams
   */
  public static tokenize(text: string): { words: string[]; trigrams: string[] } {
    const cleaned = (text || "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = cleaned
      .split(" ")
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));

    // Generate character trigrams for typo-tolerant matching
    const trigrams: string[] = [];
    const condensed = cleaned.replace(/\s+/g, "");
    if (condensed.length >= 3) {
      for (let i = 0; i <= condensed.length - 3; i++) {
        trigrams.push(condensed.slice(i, i + 3));
      }
    }

    return { words, trigrams };
  }

  /**
   * Compute Cosine Similarity between two token frequency maps
   */
  public static cosineSimilarity(tokensA: string[], tokensB: string[]): number {
    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const freqA = new Map<string, number>();
    const freqB = new Map<string, number>();

    for (const t of tokensA) freqA.set(t, (freqA.get(t) || 0) + 1);
    for (const t of tokensB) freqB.set(t, (freqB.get(t) || 0) + 1);

    let dotProduct = 0;
    for (const [token, countA] of freqA.entries()) {
      const countB = freqB.get(token);
      if (countB) dotProduct += countA * countB;
    }

    let normA = 0;
    for (const count of freqA.values()) normA += count * count;

    let normB = 0;
    for (const count of freqB.values()) normB += count * count;

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Compute Jaccard Similarity between two sets of tokens
   */
  public static jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Evaluate a candidate complaint against new complaint input
   */
  public static evaluateCandidate(
    input: DuplicateCheckInput,
    candidate: DuplicateCheckCandidate
  ): {
    score: number;
    distanceMeters: number | null;
    distanceLabel: string;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // --- 1. Geospatial Scoring ---
    let geoScore = 0;
    let distanceMeters: number | null = null;
    let distanceLabel = "Unknown distance";

    const hasInputCoords = input.latitude != null && input.longitude != null;
    const hasCandCoords = candidate.latitude != null && candidate.longitude != null;

    if (hasInputCoords && hasCandCoords) {
      distanceMeters = this.haversineDistanceMeters(
        input.latitude!,
        input.longitude!,
        candidate.latitude!,
        candidate.longitude!
      );

      if (distanceMeters <= 50) {
        geoScore = 1.0;
        distanceLabel = `${distanceMeters}m away (Immediate vicinity)`;
        reasons.push(`Exact location match (${distanceMeters}m away)`);
      } else if (distanceMeters <= 350) {
        geoScore = 1.0 - (distanceMeters - 50) / 350;
        distanceLabel = `${distanceMeters}m away (Same street/block)`;
        reasons.push(`Nearby location (${distanceMeters}m away)`);
      } else if (distanceMeters <= 750) {
        geoScore = 0.4 * (1.0 - (distanceMeters - 350) / 400);
        distanceLabel = `${distanceMeters}m away`;
      } else {
        geoScore = 0.0;
        distanceLabel = `${(distanceMeters / 1000).toFixed(1)}km away`;
      }
    } else if (input.ward_number != null && candidate.ward_number != null) {
      if (input.ward_number === candidate.ward_number) {
        geoScore = 0.70;
        distanceLabel = `In Ward ${input.ward_number}`;
        reasons.push(`Same Ward (Ward ${input.ward_number})`);
      } else {
        geoScore = 0.15;
        distanceLabel = `Different Ward (Ward ${candidate.ward_number})`;
      }
    } else {
      geoScore = 0.50; // Neutral fallback when no location given
    }

    // --- 2. Text Semantic Scoring ---
    const inputText = `${input.title} ${input.title} ${input.description || ""}`;
    const candText = `${candidate.title} ${candidate.title} ${candidate.description || ""}`;

    const inputTokens = this.tokenize(inputText);
    const candTokens = this.tokenize(candText);

    const wordCosSim = this.cosineSimilarity(inputTokens.words, candTokens.words);
    const trigramCosSim = this.cosineSimilarity(inputTokens.trigrams, candTokens.trigrams);

    const setInputWords = new Set(inputTokens.words);
    const setCandWords = new Set(candTokens.words);
    const wordJaccard = this.jaccardSimilarity(setInputWords, setCandWords);

    // Blended text score
    const textScore = 0.50 * wordCosSim + 0.30 * trigramCosSim + 0.20 * wordJaccard;

    if (textScore >= 0.70) {
      reasons.push("Very strong issue description match");
    } else if (textScore >= 0.45) {
      reasons.push("Similar description and keywords");
    }

    // --- 3. Category Match Bonus ---
    let catBonus = 0;
    if (input.category_id && candidate.category_id && input.category_id === candidate.category_id) {
      catBonus = 0.12;
      reasons.push(`Same category (${candidate.category_name || "Assigned"})`);
    }

    // --- 4. Composite Score Synthesis ---
    let rawScore = 0;
    if (hasInputCoords && hasCandCoords) {
      // With GPS: 50% Geo, 40% Text, 10% Category
      rawScore = 0.50 * geoScore + 0.40 * textScore + catBonus;
    } else if (input.ward_number != null) {
      // With Ward: 35% Geo, 53% Text, 12% Category
      rawScore = 0.35 * geoScore + 0.53 * textScore + catBonus;
    } else {
      // Text dominant
      rawScore = 0.85 * textScore + catBonus;
    }

    // Bound between 0 and 100
    const finalScore = Math.min(100, Math.max(0, Math.round(rawScore * 100)));

    return {
      score: finalScore,
      distanceMeters,
      distanceLabel,
      reasons,
    };
  }

  /**
   * Search through active candidate complaints and return matches above threshold
   */
  public static findDuplicates(
    input: DuplicateCheckInput,
    candidates: DuplicateCheckCandidate[],
    threshold: number = 55
  ): DuplicateMatchResult[] {
    const results: DuplicateMatchResult[] = [];

    for (const candidate of candidates) {
      const evaluation = this.evaluateCandidate(input, candidate);

      if (evaluation.score >= threshold) {
        results.push({
          complaint: {
            co_uid: candidate.co_uid,
            tracking_id: candidate.tracking_id,
            title: candidate.title,
            description: candidate.description,
            category_name: candidate.category_name,
            department_name: candidate.department_name,
            status: candidate.status,
            severity_level: candidate.severity_level,
            priority: candidate.priority,
            ward_number: candidate.ward_number,
            upvote_count: candidate.upvote_count || 1,
            submitted_date: candidate.submitted_date,
          },
          similarity_score: evaluation.score,
          confidence_level: evaluation.score >= 75 ? "high" : "medium",
          distance_meters: evaluation.distanceMeters,
          distance_label: evaluation.distanceLabel,
          reasons: evaluation.reasons,
        });
      }
    }

    // Sort by highest similarity score
    return results.sort((a, b) => b.similarity_score - a.similarity_score);
  }
}
