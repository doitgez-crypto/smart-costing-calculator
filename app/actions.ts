"use server";

import {
  calculateAndLogOnSheet,
  getSettingsConfig,
  saveSettingsConfig,
  type CalculationInput,
  type SettingsConfig
} from "@/lib/google-sheets";
import { revalidatePath } from "next/cache";

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
  await saveSettingsConfig(nextSettings);
  // Force Next.js to refresh the UI immediately after settings update.
  revalidatePath("/");
  revalidatePath("/admin");
  return getSettingsConfig();
}

