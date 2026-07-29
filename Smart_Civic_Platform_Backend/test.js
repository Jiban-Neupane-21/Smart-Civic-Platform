require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from("teams")
    .select(`
      *,
      team_members (
        staff_id, is_leader, joined_at, acknowledged_at,
        staff (
          id, employee_id, expertise,
          profiles ( full_name, email )
        )
      )
    `)
    .limit(1);
    
  console.log("Error:", error);
}

test();
