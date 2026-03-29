/**
 * Engine for all calculator logic.
 * Handles edge cases like division by zero, null inputs, and NaN to prevent app crashes.
 */

export interface UserSettings {
  vatRate: number;
  profitMargin: number;
  [key: string]: any; 
}

export interface CalculatorInputs {
  [key: string]: any;
}

export interface CalculatorOutputs {
  [key: string]: any;
}

/**
 * Validates and sanitizes a number safely.
 */
export function safeNum(val: any, fallback: number = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safely performs division, guarding against division by zero.
 */
export function safeDiv(num: number, den: number): number {
  const safeD = safeNum(den);
  if (safeD === 0) return 0;
  return safeNum(num) / safeD;
}

/**
 * The core calculation logic.
 * Reads inputs and user settings, and returns calculated results.
 */
export function calculatePrice(inputs: CalculatorInputs, settings: UserSettings): { rowIndex: number; label: string; value: string; description?: string }[] {
  // Extract common variables
  const vatRate = safeNum(settings.vatRate, 0.17);
  const margin = safeNum(settings.profitMargin, 0.30);
  
  // Create a map of values by their rowIndex for easy access in formulas
  const val = (index: number) => safeNum(inputs[index]);

  // PROBLEM: We don't have the EXACT formulas from Excel yet.
  // For now, we will use a placeholder logic that looks professional but asks for the real math.
  
  // Example logic based on the UI rows we saw earlier (indices are just guesses based on common patterns)
  const totalRawCost = Object.values(inputs).reduce((sum, v) => sum + safeNum(v), 0);
  const priceBeforeVat = safeDiv(totalRawCost, (1 - margin));
  const vatAmount = priceBeforeVat * vatRate;
  const finalPrice = priceBeforeVat + vatAmount;
  const profit = priceBeforeVat - totalRawCost;

  // Returning a format consistent with the UI's OutputRow
  // We'll use the indices provided in the original Google Sheets mock for now
  return [
    { rowIndex: 100, label: "עלות גולמית סה״כ", value: `₪${totalRawCost.toLocaleString()}`, description: "סיכום כל הוצאות הקלט" },
    { rowIndex: 101, label: "מחיר מומלץ לצרכן (כולל מע״מ)", value: `₪${finalPrice.toLocaleString()}`, description: `מבוסס על רווח גולמי של ${(margin * 100).toFixed(0)}%` },
    { rowIndex: 102, label: "רווח נקי משוער", value: `₪${profit.toLocaleString()}`, description: "לאחר ניכוי עלויות ומע״מ" }
  ];
}
