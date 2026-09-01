const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
    const envFile = fs.readFileSync('.env', 'utf8');
    const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)[1].trim();
    const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
    const tid = `TKT-${year}-${rand}-${Date.now().toString().slice(-4)}`;
    console.log("Mock generated tracking id:", tid);

    const { data, error } = await supabase.from('complaints').insert({
        citizen_id: "26c2e22e-af69-4265-a6b2-8e4ee24669c9",
        tracking_id: tid,
        municipality_id: "519d8eac-53ca-4b11-802d-548c484e867b",
        category_id: "902e1023-d9a3-4974-9ef6-e10f12923510",
        assigned_department_id: "44720168-72b9-40e8-a2b0-889b67cbee43",
        lead_department_id: "44720168-72b9-40e8-a2b0-889b67cbee43",
        title: "Test Ticket",
        description: "Test description",
        severity_level: "high",
        priority: "high"
    }).select();

    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("Insert success:", data);
    }
}
run();
