import { runEngineV2FromDbRecord } from "./lib/financial-engine-v2";

const mockInputs = {
  "field_5": 100, // rawMaterials
  "field_6": 50,  // directLabor
  "field_10": 2000, // rent
  "tax_19": 50,     // monthlyUnits
  "tax_30": 30,   // targetProfitMargin
  "field_22": 5,  // commissionRate 5%
  "field_23": 2,  // clearingRate 2%
  "field_71": 250,  // competitorPrice
};

try {
  const result = runEngineV2FromDbRecord(mockInputs);
  console.log("Full Engine Result:", JSON.stringify(result, null, 2));
} catch (e) {
  console.error("Engine failed:", e);
}
