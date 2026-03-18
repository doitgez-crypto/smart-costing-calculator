import type { Metadata } from "next";
import { getDynamicInputsAndOutputs } from "@/lib/google-sheets";
import { CalculatorForm } from "@/components/calculator-form";
import Link from "next/link";
import { Settings as SettingsIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "מחשבון עלויות חכם"
};

export const revalidate = 0;

export default async function Page() {
  const { inputs, outputs } = await getDynamicInputsAndOutputs();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-600 text-right">
          המחשבון מחובר ל־Google Sheets. שורות קלט/פלט מוגדרות בלשונית{" "}
          <span className="font-medium">Settings</span> ומשמשות לבניית ה־UI.
        </p>

        <div className="flex items-center justify-end">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/60 px-3 py-2 text-sm text-gray-700 hover:bg-white transition-colors"
          >
            <SettingsIcon className="w-4 h-4 text-blue-600" />
            <span className="whitespace-nowrap">הגדרות</span>
          </Link>
        </div>
      </div>

      <CalculatorForm initialInputs={inputs} initialOutputs={outputs} />
    </div>
  );
}

