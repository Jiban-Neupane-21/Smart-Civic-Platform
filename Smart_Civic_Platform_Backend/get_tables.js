const postgres = require('postgres');

async function run() {
    const dbUrl = "postgresql://postgres.vfqdzcowwcclsufxaqyf:Password@123!@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
    const sql = postgres(dbUrl);

    const res = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
    `;
    
    console.log("Tables:");
    res.forEach(r => console.log(r.table_name));

    await sql.end();
}
run();
