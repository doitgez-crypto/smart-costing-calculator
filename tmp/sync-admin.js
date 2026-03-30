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

async function syncAdmin() {
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  
  const rotem = users.find(u => u.email === "rotemdeyong@gmail.com");
  const doit = users.find(u => u.email === "doit.gez@gmail.com");

  if (rotem && doit) {
    console.log('Rotem Metadata:', JSON.stringify(rotem.user_metadata));
    console.log('Doit Metadata (Before):', JSON.stringify(doit.user_metadata));
    
    // Sync metadata structure
    const newMetadata = {
      ...doit.user_metadata,
      role: 'admin',
      full_name: 'Doit Gez'
    };

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(doit.id, {
      user_metadata: newMetadata,
      app_metadata: { role: 'admin' }
    });

    if (authError) console.error('Auth Error:', authError.message);
    else console.log('✅ Auth Metadata Synced.');

    // Ensure profile exists too
    await supabaseAdmin.from('profiles').upsert({
      id: doit.id,
      email: doit.email
    }, { onConflict: 'id' });
    
    console.log('✅ Profile synced.');
  }
}

syncAdmin();
