const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
    env[key] = value;
  }
});

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function forceAdmin() {
  const target = "doit.gez@gmail.com";
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const user = users.find(u => u.email === target);
  
  if (user) {
    console.log(`Found user ${target}. Current Metadata:`, JSON.stringify(user.user_metadata));
    
    // Force update both user_metadata and app_metadata
    const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role: 'admin' },
      app_metadata: { role: 'admin' }
    });

    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('✅ Successfully updated to Admin.');
      console.log('New Metadata:', JSON.stringify(updated.user.user_metadata));
    }
  } else {
    console.log('User not found.');
  }
}

forceAdmin();
