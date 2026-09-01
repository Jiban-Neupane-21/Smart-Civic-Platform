import { SupabaseClient } from "@supabase/supabase-js";

export interface ResolvedLocation {
  source: "registered_address" | "gps" | "manual";
  municipality_id: string;
  ward_id: string | null;
  ward_number: number | null;
  latitude: number | null;
  longitude: number | null;
}

export class LocationResolverService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Resolve location based on submission choice
   */
  async resolveLocation(
    citizenId: string,
    payloadLocation?: {
      source?: "registered_address" | "gps" | "manual";
      municipality_id?: string;
      ward_id?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<ResolvedLocation> {
    const source = payloadLocation?.source || "registered_address";

    if (source === "manual" && payloadLocation?.municipality_id) {
      let wardNumber: number | null = null;
      if (payloadLocation.ward_id) {
        const { data: ward } = await this.supabaseAdmin
          .from("wards")
          .select("ward_number")
          .eq("id", payloadLocation.ward_id)
          .maybeSingle();
        wardNumber = ward?.ward_number ?? null;
      }

      return {
        source: "manual",
        municipality_id: payloadLocation.municipality_id,
        ward_id: payloadLocation.ward_id ?? null,
        ward_number: wardNumber,
        latitude: payloadLocation.latitude ?? null,
        longitude: payloadLocation.longitude ?? null,
      };
    }

    if (source === "gps" && payloadLocation?.latitude && payloadLocation?.longitude) {
      // Use municipality provided in payload, or fallback to citizen registered address
      const muniId = payloadLocation.municipality_id;
      let wardNumber: number | null = null;

      if (payloadLocation.ward_id) {
        const { data: ward } = await this.supabaseAdmin
          .from("wards")
          .select("ward_number")
          .eq("id", payloadLocation.ward_id)
          .maybeSingle();
        wardNumber = ward?.ward_number ?? null;
      }

      if (muniId) {
        return {
          source: "gps",
          municipality_id: muniId,
          ward_id: payloadLocation.ward_id ?? null,
          ward_number: wardNumber,
          latitude: payloadLocation.latitude,
          longitude: payloadLocation.longitude,
        };
      }
    }

    // Default: Registered address resolution
    const { data: citizen } = await this.supabaseAdmin
      .from("citizens")
      .select("current_municipality_id, current_ward_id, permanent_municipality_id, permanent_ward_id, ward_id")
      .eq("id", citizenId)
      .single();

    const resolvedMuniId =
      payloadLocation?.municipality_id ||
      citizen?.current_municipality_id ||
      citizen?.permanent_municipality_id;

    const resolvedWardId =
      payloadLocation?.ward_id ||
      citizen?.current_ward_id ||
      citizen?.permanent_ward_id ||
      citizen?.ward_id;

    if (!resolvedMuniId) {
      throw new Error("Unable to resolve municipality for this grievance. Please specify your municipality or select location manually.");
    }

    let wardNumber: number | null = null;
    if (resolvedWardId) {
      const { data: ward } = await this.supabaseAdmin
        .from("wards")
        .select("ward_number")
        .eq("id", resolvedWardId)
        .maybeSingle();
      wardNumber = ward?.ward_number ?? null;
    }

    return {
      source,
      municipality_id: resolvedMuniId,
      ward_id: resolvedWardId ?? null,
      ward_number: wardNumber,
      latitude: payloadLocation?.latitude ?? null,
      longitude: payloadLocation?.longitude ?? null,
    };
  }
}
