
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function bypass() {
  const { data: users } = await supabase.from('profiles').select('id').eq('email', 'test_staff_1786675532150@civic.gov.np').single();
  if (users) {
      await supabase.from('profiles').update({ identity_document_url: 'https://example.com/fake-id.jpg' }).eq('id', users.id);
  }
}
bypass();
