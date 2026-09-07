const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/Smart-Civic-Platform/Smart_Civic_Platform_Backend/.env' });
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function backfillComplaintWards() {
  console.log("--> Starting backfill for complaints with null ward_number...");

  // 1. Fetch complaints where ward_number is null
  const { data: complaints, error } = await client
    .from("complaints")
    .select("co_uid, tracking_id, ward_number, citizen_id, location_source")
    .is("ward_number", null);

  if (error) {
    console.error("Error fetching complaints:", error.message);
    return;
  }

  console.log(`Found ${complaints.length} complaint(s) with null ward_number.`);

  for (const c of complaints) {
    if (!c.citizen_id) continue;

    // Fetch citizen ward info
    const { data: citizen } = await client
      .from("citizens")
      .select("current_ward_id, permanent_ward_id, current_address, permanent_address")
      .eq("id", c.citizen_id)
      .maybeSingle();

    let resolvedWardNumber = null;

    if (citizen) {
      const wardId = citizen.current_ward_id || citizen.permanent_ward_id;
      if (wardId) {
        const { data: ward } = await client
          .from("wards")
          .select("ward_no")
          .eq("id", wardId)
          .maybeSingle();
        if (ward?.ward_no) {
          resolvedWardNumber = ward.ward_no;
        }
      }

      if (!resolvedWardNumber && citizen.current_address) {
        const m = citizen.current_address.match(/ward\s*(\d+)/i);
        if (m) resolvedWardNumber = parseInt(m[1], 10);
      }
    }

    if (resolvedWardNumber) {
      const { error: updateErr } = await client
        .from("complaints")
        .update({ ward_number: resolvedWardNumber })
        .eq("co_uid", c.co_uid);

      if (updateErr) {
        console.error(`Failed to update complaint ${c.tracking_id}:`, updateErr.message);
      } else {
        console.log(`Updated complaint ${c.tracking_id} (${c.co_uid}) with ward_number: ${resolvedWardNumber}`);
      }
    } else {
      console.log(`Could not resolve ward for complaint ${c.tracking_id}`);
    }
  }

  console.log("--> Backfill complete!");
}

backfillComplaintWards();
