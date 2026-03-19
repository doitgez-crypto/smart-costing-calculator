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
      <div className="flex flex-col md:flex-row items-end md:items-start justify-between gap-4">


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

