import "../src/config/env";
import { supabaseAdmin } from "../src/config/supabase";

async function checkSuperadmin() {
  console.log("\n🔍 Checking for superadmin accounts...\n");

  // Check profiles table for superadmins
  const { data: superadmins, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role, account_status, created_at")
    .eq("role", "superadmin")
    .eq("is_deleted", false);

  if (error) {
    console.error("❌ Error querying profiles:", error.message);
    console.error("   Code:", error.code);
    console.error("\n💡 This likely means the SQL schema has NOT been applied to Supabase yet.");
    console.error("   Run smart_civic_platform.sql in Supabase SQL Editor first.\n");
    process.exit(1);
  }

  if (!superadmins || superadmins.length === 0) {
    console.log("⚠️  No superadmin accounts found in the database.\n");
    console.log("To create one, you have two options:");
    console.log("\n  Option 1: Use the API (requires an existing superadmin)");
    console.log("    POST http://localhost:3000/api/superadmin/admins");
    console.log("\n  Option 2: Create manually via Supabase Dashboard");
    console.log("    1. Go to https://supabase.com/dashboard/project/yluxihdvmwjzjvasyiqd/auth/users");
    console.log("    2. Click 'Add user' → set email + password");
    console.log("    3. Then go to Table Editor → profiles table");
    console.log("    4. Find the user row and set role = 'superadmin'");
  } else {
    console.log(`✅ Found ${superadmins.length} superadmin account(s):\n`);
    superadmins.forEach((admin, i) => {
      console.log(`  ${i + 1}. Name:    ${admin.full_name}`);
      console.log(`     Email:   ${admin.email}`);
      console.log(`     Status:  ${admin.account_status}`);
      console.log(`     Created: ${new Date(admin.created_at).toLocaleString()}`);
      console.log(`     ID:      ${admin.id}`);
      console.log();
    });
  }

  // Also check total user count
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false);

  console.log(`📊 Total users in system: ${count ?? 0}`);
  process.exit(0);
}

checkSuperadmin();
