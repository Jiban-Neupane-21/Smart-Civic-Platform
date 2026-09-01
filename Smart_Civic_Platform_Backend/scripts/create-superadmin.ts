import { supabaseAdmin } from "../src/config/supabase";

async function createSuperAdmin() {
  const email = "superadmin@civic.gov.np";
  const password = "SuperAdmin@123!";

  console.log(`[Script] Creating Superadmin for ${email}...`);

  try {
    // 1. Check and delete existing user if present
    const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      console.error("[Script] Error listing users:", listErr.message);
    } else {
      const existingUser = usersList.users.find((u) => u.email === email);
      if (existingUser) {
        console.log(`[Script] Existing auth user found (${existingUser.id}). Deleting...`);
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      }
    }

    // 2. Create user via Supabase Auth Admin API
    const { data, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "System Superadmin",
        role: "superadmin",
      },
    });

    if (createErr || !data.user) {
      console.error("[Script] Failed to create auth user:", createErr?.message);
      process.exit(1);
    }

    console.log(`[Script] Auth user created! ID: ${data.user.id}`);

    // 3. Upsert profile record
    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: "System Superadmin",
      phone: "9800000000",
      role: "superadmin",
      account_status: "active",
      onboarding_wizard_completed: true,
      force_password_reset: false,
    });

    if (profileErr) {
      console.error("[Script] Failed to upsert profile record:", profileErr.message);
      process.exit(1);
    }

    console.log("[Script] ✅ Superadmin created successfully!");
    console.log(`[Script] Email: ${email}`);
    console.log(`[Script] Password: ${password}`);
  } catch (err: any) {
    console.error("[Script] Exception:", err.message);
    process.exit(1);
  }
}

createSuperAdmin();
