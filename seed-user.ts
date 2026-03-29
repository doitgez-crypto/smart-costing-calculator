import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

// Create a Supabase admin client using the service role key
// This bypasses RLS and allows direct user creation in auth.users
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedUser() {
  const email = process.argv[2] || "rotemdeyong@gmail.com";
  const password = process.argv[3] || "password123";

  console.log(`Attempting to create or update user: ${email}...`);

  try {
    // 1. Try to create the user
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    let userId = createData?.user?.id;

    if (createError) {
      if (createError.message.includes("already been registered")) {
        console.log("User already exists. Attempting to update password instead...");
        
        // 2. Fetch the user to get their ID
        const { data: listUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = listUsers.users.find(u => u.email === email);
        if (!existingUser) {
          console.error("Could not find existing user to update.");
          return;
        }
        
        userId = existingUser.id;
        
        // 3. Update the password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true
        });
        
        if (updateError) {
          console.error("Failed to update user password:", updateError.message);
          return;
        }
        console.log("✅ User password successfully updated (reset) via Supabase Auth Admin API!");
      } else {
        console.error("Failed to create user in Auth:", createError.message);
        return;
      }
    } else {
      console.log("✅ User successfully created in Supabase Auth!");
    }

    if (!userId) return;

    console.log(`User ID: ${userId}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
    // 4. Ensure profile exists
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: userId,
        email: email,
        display_settings: {},
        field_configs: {}
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn("⚠️ Note: Profile upsert warning:", profileError.message);
    } else {
      console.log("✅ User profile synced in 'profiles' table.");
    }

  } catch (error: any) {
    console.error("Unexpected error:", error.message || error);
  }
}

seedUser();
