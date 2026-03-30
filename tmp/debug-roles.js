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

async function debugAll() {
  console.log('--- FETCHING FROM AUTH.ADMIN ---');
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) throw authError;

  users.forEach(u => {
    console.log(`Auth: ${u.email} | ID: ${u.id} | Role: ${u.user_metadata?.role}`);
  });

  console.log('\n--- FETCHING FROM PUBLIC.PROFILES ---');
  const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*');
  if (profileError) throw profileError;

  profiles.forEach(p => {
    console.log(`Profile: ${p.email || p.id} | ID: ${p.id} | Role: ${p.role}`);
  });

  const target = "doit.gez@gmail.com";
  const authUser = users.find(u => u.email === target);
  
  if (authUser) {
    console.log(`\nFixing ${target}...`);
    // 1. Update Auth Metadata
    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      user_metadata: { ...authUser.user_metadata, role: 'admin' }
    });
    
    // 2. Update Profile Table (if it exists there)
    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
      id: authUser.id,
      email: target,
      role: 'admin' // Some systems use a role column in profiles
    }, { onConflict: 'id' });

    if (upsertError) console.error('Profile update error:', upsertError.message);
    else console.log('✅ Profile updated.');
  }
}

debugAll().catch(console.error);
