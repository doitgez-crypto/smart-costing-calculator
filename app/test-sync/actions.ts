"use server";

import { calculateAndLogOnSheet } from "@/lib/google-sheets";
import { runEngineV2FromDbRecord } from "@/lib/financial-engine-v2";
import { EXCEL_ROW_MAP } from "@/lib/excel-map";

export type TestResultDiff = {
  id: string;
  label: string;
  rowIndex: number;
  v1Value: number;
  v2Value: number;
  diff: number;
  status: "MATCH" | "WARNING" | "ERROR";
};

export async function runComparativeTest() {
  // 1. Define Standardized Mock Inputs
  const mockDbRecord: Record<string, number> = {
    // Inputs (from V2 config)
    "field_5": 100, // rawMaterials
    "field_6": 50,  // directLabor
    "field_7": 10,  // otherDirectCosts
    "field_10": 2000, // rent
    "field_11": 500,  // utilities
    "field_12": 100,  // insurance
    "field_13": 300,  // accounting
    "field_14": 0,    // pension
    "field_15": 0,    // carExpenses
    "field_16": 1000, // marketing
    "field_17": 0,    // otherOverhead
    "tax_19": 50,     // monthlyUnits
    "field_22": 0.05, // commissionRate (5%)
    "field_23": 0.02, // clearingRate (2%)
    "field_24": 5,    // otherVariableCostFixed
    "tax_26": 0.10,   // incomeTaxRate (10%)
    "field_27": 0.05, // socialSecurityRate (5%)
    "field_28": 0.17, // vatRate (17%)
    "tax_30": 0.30,   // targetNetProfitMargin (30%)
    
    // Margins and Market
    "field_66": 0.10, // safetyMarginRate (10%)
    "field_67": 0.01, // badDebtRate (1%)
    "field_68": 0.08, // financingAnnualRate (8%)
    "field_69": 30,   // customerCreditDays
    "tax_70": 30,     // supplierCreditDays
    "field_71": 250,  // competitorPrice
  };

  // 2. Prepare Payload for V1 (Google Sheets)
  const v1Inputs = Object.keys(mockDbRecord).map(id => {
    const rowDef = EXCEL_ROW_MAP[id];
    return {
      rowIndex: rowDef.rowIndex,
      value: String(mockDbRecord[id])
    };
  });

  // 3. Run V1 (Google Sheets)
  const v1Response = await calculateAndLogOnSheet({
    userName: "TestRunner",
    inputs: v1Inputs,
    outputRows: [] // We want EVERYTHING back ideally, but Google Sheets script usually returns only requested outputRows.
    // Wait, getCalculations or calculateAndLogOnSheet only returns 'results' based on outputRows.
    // We will supply all known output rows to V1.
  });

  // Since Google Sheets only returns requested rows, let's request all Rows that V2 outputs.
  // Actually, calculateAndLogOnSheet takes `outputRows` and returns them.
  // In `calculator-form.tsx`, we send outputRows. Let's send ALL possible output rows to Google Sheets.
  
  // Actually, a better way is to construct a specific `v1OutputRows` array from EXCEL_ROW_MAP for all result rows
  const allOutputRows = Object.values(EXCEL_ROW_MAP)
    .filter(f => !Object.keys(mockDbRecord).includes(f.id)) // If it wasn't an input, it's an output
    .map(f => f.rowIndex);

  const fullV1Response = await calculateAndLogOnSheet({
    userName: "TestRunner",
    inputs: v1Inputs,
    outputRows: allOutputRows, 
    // Wait, the Google Sheets script does a remote call. If we send 80 rows, it fetches 80 rows.
  });

  // Map V1 Results to ID dictionary
  const v1ResultsDb: Record<string, number> = {};
  fullV1Response.results?.forEach(r => {
    // Find ID by row
    const field = Object.values(EXCEL_ROW_MAP).find(f => f.rowIndex === r.rowIndex);
    if (field) {
      v1ResultsDb[field.id] = parseFloat(r.value.replace(/[^0-9.-]+/g, "")) || 0;
    }
  });

  // 4. Run V2 (Local TypeScript Engine)
  const v2ResultsDb = runEngineV2FromDbRecord(mockDbRecord);

  // 5. Compare V1 vs V2
  const discrepancies: TestResultDiff[] = [];
  
  Object.keys(v2ResultsDb).forEach(id => {
    // Only compare outputs (skip inputs)
    if (Object.keys(mockDbRecord).includes(id)) return;

    const rowDef = EXCEL_ROW_MAP[id];
    if (!rowDef) return;

    const v1Val = v1ResultsDb[id] || 0;
    const v2Val = v2ResultsDb[id] || 0;
    const diff = Math.abs(v1Val - v2Val);

    let status: "MATCH" | "WARNING" | "ERROR" = "MATCH";
    
    // Tolerance of 1 NIS exactly as requested
    if (diff > 1.05) {
      status = "ERROR";
    } else if (diff > 0.05) {
      status = "WARNING"; // Small rounding diff
    }

    if (status !== "MATCH") {
       discrepancies.push({
         id,
         label: rowDef.label,
         rowIndex: rowDef.rowIndex,
         v1Value: v1Val,
         v2Value: v2Val,
         diff: diff,
         status
       });
    }
  });

  // Sort discrepancies by row index
  discrepancies.sort((a, b) => a.rowIndex - b.rowIndex);

  return {
    success: true,
    mockDbRecord,
    discrepancies,
    totalCompared: Object.keys(v2ResultsDb).length - Object.keys(mockDbRecord).length
  };
}
