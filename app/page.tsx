import type { Metadata } from "next";
import { getFieldsFromConfig } from "@/lib/calculator-config";
import { CalculatorForm } from "@/components/calculator-form";
import Link from "next/link";
import { Settings as SettingsIcon, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings, getUserProfile, type SettingsConfig } from "@/app/actions";

import { getCalculationById } from "@/lib/actions/calculations";

export const metadata: Metadata = {
  title: "מחשבון עלויות חכם"
};

export const revalidate = 0;

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const supabase = await createClient();
  const params = await searchParams;
  const rawLoadId = params.load;
  const loadId = Array.isArray(rawLoadId) ? rawLoadId[0] : rawLoadId;

  // Resolve defaults
  let user = null;
  let userName = "משתמש";
  let loadedData = null;
  let settings: SettingsConfig = { 
    inputRows: [4, 5, 6, 19, 20, 21, 25, 30], 
    outputRows: [76, 109, 114, 115, 116], 
    percentageRows: [7, 25, 30],
    vatRate: 0.17, 
    profitMargin: 0.30 
  };
  let profile = { ui_permissions: {}, field_configs: {}, display_settings: {} };

  try {
    // Parallelize all data fetching
    const [authData, calcData, s, p] = await Promise.all([
      supabase.auth.getUser().catch(() => ({ data: { user: null } })),
      loadId && process.env.DATABASE_URL ? getCalculationById(loadId).catch(() => null) : Promise.resolve(null),
      getUserSettings().catch(() => null),
      getUserProfile().catch(() => null)
    ]);

    user = authData.data?.user;
    if (user) {
      userName = user.user_metadata?.first_name || user.email?.split('@')[0] || "משתמש";
    }

    if (calcData) loadedData = calcData;
    if (s) settings = s;
    if (p) profile = p;
  } catch (err) {
    console.error("Error fetching dependencies in Root Page:", err);
  }

  const { inputs, outputs } = getFieldsFromConfig(profile.field_configs, profile.display_settings || settings);

  // Cast to the expected types since the library might have optional fields
  const typedInputs = inputs.map(i => ({
    ...i,
    description: i.description || "",
    hint: i.hint || "",
    isPercentage: !!i.isPercentage
  }));

  const typedOutputs = outputs.map(o => ({
    ...o,
    description: o.description || ""
  }));

  return (
    <div className="space-y-6 relative">
      <Link
        href="/admin"
        className="fixed top-4 left-4 z-[100] p-3 rounded-full bg-white/60 backdrop-blur-md shadow-lg border border-white/40 hover:bg-white transition-all hover:-translate-y-1 hover:shadow-blue-500/20 pointer-events-auto group"
        title="הגדרות"
      >
        <SettingsIcon className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
      </Link>

      <CalculatorForm 
        initialInputs={typedInputs as any} 
        initialOutputs={typedOutputs as any} 
        initialUserName={userName} 
        initialSettings={{
          ...settings,
          vatRate: settings.vatRate ?? 0.17,
          profitMargin: settings.profitMargin ?? 0.30
        }}
        initialPermissions={profile?.ui_permissions || {}}
        loadedCalculation={loadedData}
      />
    </div>
  );
}

