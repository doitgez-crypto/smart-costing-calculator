import type { Metadata } from "next";
import { getDynamicInputsAndOutputs } from "@/lib/google-sheets";
import { CalculatorForm } from "@/components/calculator-form";
import Link from "next/link";
import { Settings as SettingsIcon, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "מחשבון עלויות חכם"
};

export const revalidate = 0;

export default async function Page() {
  const { inputs, outputs } = await getDynamicInputsAndOutputs();

  return (
    <div className="space-y-6 relative">
      <Link
        href="/admin"
        className="fixed top-4 left-4 z-[100] p-3 rounded-full bg-white/60 backdrop-blur-md shadow-lg border border-white/40 hover:bg-white transition-all hover:-translate-y-1 hover:shadow-blue-500/20 pointer-events-auto group"
        title="הגדרות"
      >
        <SettingsIcon className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
      </Link>

      <CalculatorForm initialInputs={inputs} initialOutputs={outputs} />
    </div>
  );
}

