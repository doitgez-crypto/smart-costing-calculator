"use server";

import { createClient } from "@/lib/supabase/server";

import {
  calculateAndLogOnSheet,
  getSettingsConfig,
  saveSettingsConfig,
  type CalculationInput,
} from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";
import { runEngineV2FromDbRecord } from "@/lib/financial-engine-v2";

export type SettingsConfig = {
  inputRows: number[];
  outputRows: number[];
  percentageRows: number[];
  monthlyRows?: number[];
  vatRate?: number;
  profitMargin?: number;
};

export type FieldConfigState = {
  [id: string]: {
    isVisible: boolean;
    isInput: boolean; // false = output
  };
};

export async function runCalculation(payload: {
  userName: string;
  inputs: CalculationInput[];
}): Promise<{ outputs: { rowIndex: number; label: string; value: string }[] }> {
  return calculateAndLogOnSheet(payload);
}

export async function loadSettings(): Promise<SettingsConfig> {
  return getSettingsConfig();
}

export async function updateSettings(nextSettings: SettingsConfig) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== 'admin') {
    throw new Error("Unauthorized: Admin role required");
  }

  await saveSettingsConfig(nextSettings);
  // Force Next.js to refresh the UI immediately after settings update.
  revalidatePath("/");
  revalidatePath("/admin");
  return getSettingsConfig();
}

// Note: Redundant saveCalculation and getCalculations removed. 
// Use '@/lib/actions/calculations' instead for Prisma-backed history.

export async function getUserSettings(): Promise<SettingsConfig> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const defaultSettings = { 
    inputRows: [4, 5, 6, 19, 20, 21, 25, 30], 
    outputRows: [76, 109, 114, 115, 116], 
    percentageRows: [7, 25, 30],
    monthlyRows: [],
    vatRate: 0.17, 
    profitMargin: 0.30 
  };
  
  if (!user) return defaultSettings;

  const { data, error } = await supabase
    .from("profiles")
    .select("display_settings")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching settings from profiles:", error);
    }
    return defaultSettings;
  }

  const ds = data?.display_settings || {};
  
  return {
    inputRows: ds.input_rows || defaultSettings.inputRows,
    outputRows: ds.output_rows || defaultSettings.outputRows,
    percentageRows: ds.percentage_rows || defaultSettings.percentageRows,
    monthlyRows: ds.monthly_rows || [],
    vatRate: ds.vat_rate || defaultSettings.vatRate,
    profitMargin: ds.profit_margin || defaultSettings.profitMargin
  };
}

export async function updateUserSettings(settings: SettingsConfig) {
  // Backwards compatibility for the old save method
  return updateProfile({ display_settings: settings });
}

export async function updateProfile(data: any) {
  const supabase = await createClient(); // וודא שהייבוא תקין
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('No user found');

  // שליפת הנתונים בצורה הכי פשוטה שיש
  const configToSave = data.field_configs || data;

  console.log('--- SERVER SAVING START ---');
  console.log('User ID:', user.id);
  console.log('Payload:', configToSave);

  const { data: updatedData, error } = await supabase
    .from('profiles')
    .upsert({ 
      id: user.id, 
      field_configs: configToSave,
      email: user.email // הוספת המייל ליתר ביטחון
    }, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('SERVER ERROR:', error);
    throw error;
  }

  console.log('SERVER SUCCESS:', updatedData);
  
  revalidatePath("/");
  revalidatePath("/admin");
  
  return { success: true };
}

export async function getUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("ui_permissions, field_configs, display_settings")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching profile:", error);
    }
    return { ui_permissions: {}, field_configs: {}, display_settings: {} }; // Safe Default
  }

  return { 
    ...data,
    field_configs: data?.field_configs || {},
    display_settings: data?.display_settings || {}
  };
}

// History operations moved to lib/actions/calculations.ts

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

/**
 * Server calculation to protect formulas and internal factors.
 * This runs the engine on the server and returns only the final display values.
 */
export async function calculateResults(inputs: Record<string, number>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Debug: Input reveal
    console.log("--- Calculation Server Input ---", inputs);

    // Run the engine
    const results = runEngineV2FromDbRecord(inputs);

    // Whitelist Audit: Ensure all keys needed for standard and advanced UI are included.
    const whitelistedResults: Record<string, any> = {};
    const sensitiveKeys = new Set(["tax_33", "tax_34"]);
    
    (Object.keys(results) as Array<keyof typeof results>).forEach(key => {
      const keyStr = String(key);
      const isDisplayKey = 
        keyStr.startsWith("field_") || 
        keyStr.startsWith("tax_") || 
        keyStr.startsWith("recommended_") || 
        keyStr.startsWith("min_") || 
        keyStr.startsWith("target_") || 
        keyStr === "net_profit_110";

      if (isDisplayKey && !sensitiveKeys.has(keyStr)) {
        whitelistedResults[keyStr] = results[key];
      }
    });

    // Debug: Output reveal
    console.log("--- Calculation Whitelisted Output ---", whitelistedResults);

    // BACKGROUND PERSISTENCE: Save to History without awaiting or blocking the return.
    // This allows the user to see results instantly even if Prisma lags or history table is huge.
    if (process.env.DATABASE_URL) {
      // Use the unified Prisma action
      import("@/lib/actions/calculations").then(async ({ saveCalculation }) => {
        try {
          await saveCalculation({
            project_name: `חישוב מתאריך ${new Date().toLocaleDateString('he-IL')}`,
            inputs: inputs,
            results: whitelistedResults
          });
          console.log(`✅ Background save successful for user ${user.id}`);
        } catch (dbErr) {
          console.error("⚠️ Background history save failed:", dbErr);
        }
      }).catch(err => {
        console.error("⚠️ Failed to import calculations action:", err);
      });
    }

    return { success: true, data: whitelistedResults };
  } catch (err: any) {
    console.error("Calculation Server Error:", err);
    return { 
      success: false, 
      error: "אירעה שגיאה בעיבוד הנתונים. נא לוודא שכל השדות הוזנו כראוי או פנה למנהל המערכת." 
    };
  }
}

export async function isDatabaseConfigured() {
  return !!process.env.DATABASE_URL;
}
