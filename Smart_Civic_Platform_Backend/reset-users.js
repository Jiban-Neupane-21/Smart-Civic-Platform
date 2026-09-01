const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function resetUser(email, tempPassword) {
  // Find user by email
  const { data: users, error: findErr } = await supabase.auth.admin.listUsers();
  if (findErr) { console.error("Error listing users:", findErr); return; }
  
  const user = users.users.find(u => u.email === email);
  if (!user) { console.error("User not found:", email); return; }
  
  // Update password and force_password_reset in profiles
  const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, { password: tempPassword });
  if (updErr) { console.error("Error updating password:", updErr); return; }
  
  const { error: profErr } = await supabase.from('profiles').update({ force_password_reset: true }).eq('id', user.id);
  if (profErr) { console.error("Error updating profile:", profErr); return; }
  
  console.log(`Successfully reset ${email} to ${tempPassword} and set force_password_reset=true`);
}

async function run() {
  await resetUser("neupanejiban89@gmail.com", "2b83497af7c2");
  await resetUser("pawanneupane@gmail.com", "d80ef342ac2e");
  await resetUser("ankit@gmail.com", "m4Z^#3Ovc21c");
}

run();
