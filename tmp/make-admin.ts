import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase URL or Service Role Key");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeAdmin() {
  const email = "rotemdeyong@gmail.com";
  
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.error("User not found");
    return;
  }
  
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'admin', full_name: 'Rotem Deyong' }
  });
  
  if (updateError) {
    console.error("Failed to update role:", updateError.message);
  } else {
    console.log(`✅ User ${email} is now an ADMIN.`);
  }
}

makeAdmin();
