import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function bypass() {
  console.log("Updating sitaramneupane@gmail.com KYC...");
  
  const { data: users, error: userError } = await supabase.from('profiles').select('id').eq('email', 'sitaramneupane@gmail.com').single();
  if (userError) {
      console.error("Error finding user:", userError);
      return;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ identity_document_url: 'https://example.com/fake-id.jpg' })
    .eq('id', users.id);
    
  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("KYC Bypassed successfully for sitaramneupane@gmail.com!");
  }
}

bypass();
