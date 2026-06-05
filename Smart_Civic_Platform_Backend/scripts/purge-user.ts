/**
 * One-time script to purge a stuck user from Supabase Auth + profiles/staff tables.
 * Run with: npx tsx scripts/purge-user.ts <email>
 *
 * Usage: npx tsx scripts/purge-user.ts neupanejiban1@gmail.com
 */

import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function purgeUser(email: string) {
  console.log(`\n🔍 Looking up user: ${email}`);

  // 1. Find profile by email
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, is_deleted, role")
    .eq("email", email)
    .maybeSingle();

  if (profileErr) {
    console.error("❌ Error fetching profile:", profileErr.message);
    process.exit(1);
  }

  if (!profile) {
    console.log("⚠️  No profile found in public.profiles — checking Supabase Auth directly...");
    
    // Try to find in auth via listing (limited to first 1000)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const authUser = users.find(u => u.email === email);
    
    if (!authUser) {
      console.log("✅ User not found anywhere. Nothing to clean up.");
      return;
    }
    
    console.log(`   Found orphaned Auth user: ${authUser.id}`);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
    if (error) {
      console.error("❌ Failed to delete Auth user:", error.message);
    } else {
      console.log("✅ Orphaned Auth user deleted from Supabase Auth.");
    }
    return;
  }

  console.log(`   Profile found: id=${profile.id}, role=${profile.role}, is_deleted=${profile.is_deleted}`);

  // 2. Clean up staff record
  const { error: staffErr } = await supabaseAdmin
    .from("staff")
    .update({
      employee_status: "inactive",
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq("profile_id", profile.id);

  if (staffErr) {
    console.warn("⚠️  Staff cleanup warning (may not exist):", staffErr.message);
  } else {
    console.log("   ✅ Staff record deactivated.");
  }

  // 3. Soft-delete the profile
  const { error: profileUpdateErr } = await supabaseAdmin
    .from("profiles")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      account_status: "inactive",
    })
    .eq("id", profile.id);

  if (profileUpdateErr) {
    console.error("❌ Failed to soft-delete profile:", profileUpdateErr.message);
  } else {
    console.log("   ✅ Profile soft-deleted.");
  }

  // 4. Hard-delete from Supabase Auth (frees up the email)
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
  if (authErr) {
    console.error("❌ Failed to delete Auth user:", authErr.message);
  } else {
    console.log("   ✅ Auth user hard-deleted from Supabase Auth.");
  }

  console.log(`\n✅ Done! Email '${email}' is now free to use.\n`);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/purge-user.ts <email>");
  process.exit(1);
}

purgeUser(email).catch(console.error);
