"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ensureAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== 'admin') {
    throw new Error("Unauthorized: Admin access required.");
  }
  return user;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client with service role key to manage Auth users
const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function fetchUsers() {
  await ensureAdmin();
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    
    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || "ללא שם",
      role: user.user_metadata?.role || "user",
      lastSignIn: user.last_sign_in_at
    }));
  } catch (error: any) {
    console.error("Error fetching users:", error.message);
    throw new Error("נכשלה טעינת רשימת המשתמשים");
  }
}

const TEMPLATE_USER_ID = process.env.TEMPLATE_USER_ID;

export async function createAdminUser(payload: { email: string; password: string; name: string; role: string }) {
  await ensureAdmin();
  if (!TEMPLATE_USER_ID) {
    console.error("❌ TEMPLATE_USER_ID is not defined in .env.local");
    return { success: false, error: "Configuration error: Missing template user ID" };
  }
  
  try {
    // 1. Create the user in Supabase Auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.name,
        role: payload.role
      }
    });

    if (createError) throw createError;

    console.log(`✅ User created in Auth: ${payload.email} (${userData.user.id})`);

    // 2. Fetch Default Settings from Template User (doit.gez@gmail.com)
    const { data: templateProfile, error: templateError } = await supabaseAdmin
      .from("profiles")
      .select("field_configs, display_settings")
      .eq("id", TEMPLATE_USER_ID)
      .single();

    if (templateError) {
      console.warn("⚠️ Could not fetch template settings:", templateError.message);
    }

    const fieldConfigs = templateProfile?.field_configs || {};
    const displaySettings = templateProfile?.display_settings || {};
    const fieldCount = Object.keys(fieldConfigs).length;

    // 3. Create/Update Profile with Template Settings
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userData.user.id,
      email: payload.email,
      field_configs: fieldConfigs,
      display_settings: displaySettings
    }, { onConflict: "id" });

    if (profileError) throw profileError;

    console.log(`✅ Duplicated ${fieldCount} setting rows for the new user from template.`);

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating user and syncing settings:", error.message);
    return { success: false, error: error.message };
  }
}

export async function updateUserPassword(userId: string, newPassword: string) {
  await ensureAdmin();
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Error updating password:", error.message);
    return { success: false, error: error.message };
  }
}

export async function updateAdminUser(userId: string, payload: { email: string; name: string; role: string }) {
  await ensureAdmin();
  try {
    // 1. Update the user in Supabase Auth
    const { data: userData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: payload.email,
      user_metadata: {
        full_name: payload.name,
        role: payload.role
      }
    });

    if (updateError) throw updateError;

    // 2. Sync email change to profile table
    await supabaseAdmin.from("profiles").update({
      email: payload.email
    }).eq("id", userId);

    console.log(`✅ User updated in Auth & Profile: ${payload.email} (${userId})`);

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user:", error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId: string) {
  await ensureAdmin();
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    // Profile will likely be deleted via cascade if set up, but let's be safe
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting user:", error.message);
    return { success: false, error: error.message };
  }
}
