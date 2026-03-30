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

export async function saveCalculation(payload: {
  inputValues: any;
  calculatedResults: any;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
      .from("calculations")
      .insert({
        user_id: user.id,
        input_values: payload.inputValues,
        // calculated_results: payload.calculatedResults, // Omitted to match DB schema changes
      });

    if (error) {
      console.error("Supabase Insert Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Server Action Exception (saveCalculation):", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

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

export async function getCalculations() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Attempting a simple select first to avoid issues with missing columns in joined profiles
    const { data, error } = await supabase
      .from("calculations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching calculations:", error);
      return [];
    }

    // Map to the UI format (HistoryLogEntry)
    return data.map(item => {
      const inputsStr = Object.entries(item.input_values || {})
        .map(([key, value]) => `[שורה ${key}]: ${value}`)
        .join("\n");

      const resultsStr = Array.isArray(item.calculated_results)
        ? item.calculated_results.map((r: any) => `${r.label}: ${r.value}`).join("\n")
        : "חישוב בוצע";

      return {
        timestamp: item.created_at,
        userName: user.email?.split('@')[0] || "משתמש",
        inputs: inputsStr,
        results: resultsStr
      };
    });
  } catch (err) {
    console.error("getCalculations error:", err);
    return [];
  }
}

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

    // Run the engine
    const results = runEngineV2FromDbRecord(inputs);

    // Whitelist: ONLY return fields defined in EXCEL_ROW_MAP or specific display keys
    // Exclude sensitive intermediate factors like taxFactor (tax_33) and pricingDenominator (tax_34)
    const whitelistedResults: Record<string, any> = {};
    
    const sensitiveKeys = new Set(["tax_33", "tax_34"]);
    
    (Object.keys(results) as Array<keyof typeof results>).forEach(key => {
      // If it's a field_ or tax_ or recommended_ key, and NOT in the sensitive list
      const keyStr = String(key);
      if ((keyStr.startsWith("field_") || keyStr.startsWith("tax_") || keyStr.startsWith("recommended_") || keyStr.startsWith("min_") || keyStr.startsWith("target_") || keyStr === "net_profit_110") && !sensitiveKeys.has(keyStr)) {
        whitelistedResults[keyStr] = results[key];
      }
    });

    return { success: true, data: whitelistedResults };
  } catch (err: any) {
    console.error("Calculation Server Error:", err);
    // Return a generic, respectful error message to the client
    return { 
      success: false, 
      error: "אירעה שגיאה בעיבוד הנתונים. נא לוודא שכל השדות הוזנו כראוי או פנה למנהל המערכת." 
    };
  }
}
