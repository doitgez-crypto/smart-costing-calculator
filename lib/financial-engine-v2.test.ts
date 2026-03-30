import { describe, it, expect } from 'vitest';
import { calculateV2, runEngineV2FromDbRecord } from './financial-engine-v2';

describe('Financial Engine V2', () => {
  it('Calculates correct recommended price for a standard product', () => {
    const inputs = {
      rawMaterials: 100,
      directLabor: 150,
      otherDirectCosts: 20,
      rent: 5000,
      utilities: 1000,
      insurance: 500,
      accounting: 1000,
      pension: 500,
      carExpenses: 2000,
      marketing: 3000,
      otherOverhead: 500,
      monthlyUnits: 100,
      commissionRate: 0.1,
      clearingRate: 0.02,
      otherVariableCostFixed: 10,
      incomeTaxRate: 0.2,
      socialSecurityRate: 0.1,
      vatRate: 0.18,
      targetNetProfitMargin: 0.25,
      safetyMarginRate: 0.05,
      badDebtRate: 0.02,
      financingAnnualRate: 0.08,
      customerCreditDays: 60,
      supplierCreditDays: 30,
      competitorPrice: 1000
    };

    const result = calculateV2(inputs);

    // Initial manual sanity check of results:
    // Direct Costs: 100+150+20 = 270
    // Total Overhead: 5000+1000+500+1000+500+2000+3000+500 = 13500
    // Overhead per Unit (100 units): 135
    // Base Cost: 270 + 135 + 10 = 415
    
    expect(result.totalDirectCosts).toBe(270);
    expect(result.totalMonthlyOverhead).toBe(13500);
    expect(result.overheadPerUnit).toBe(135);
    expect(result.baseCost).toBe(415);
    
    // Recommended price should definitely be > 0
    expect(result.recommendedPriceNet).toBeGreaterThan(500);
    expect(result.netProfit).toBeGreaterThan(0);
  });

  it('Handels zero units gracefully for overhead allocation', () => {
    const inputs = {
      rawMaterials: 10,
      directLabor: 0,
      otherDirectCosts: 0,
      rent: 1000,
      utilities: 0,
      insurance: 0,
      accounting: 0,
      pension: 0,
      carExpenses: 0,
      marketing: 0,
      otherOverhead: 0,
      monthlyUnits: 0, // 0 units
      commissionRate: 0,
      clearingRate: 0,
      otherVariableCostFixed: 0,
      incomeTaxRate: 0,
      socialSecurityRate: 0,
      vatRate: 0,
      targetNetProfitMargin: 0.1,
      safetyMarginRate: 0,
      badDebtRate: 0,
      financingAnnualRate: 0,
      customerCreditDays: 0,
      supplierCreditDays: 0,
      competitorPrice: 0
    };

    const result = calculateV2(inputs);
    // 1000 overhead / 0 units should be 0 overhead per unit (to avoid infinity)
    expect(result.overheadPerUnit).toBe(0);
    expect(result.targetPriceNet).toBeGreaterThan(10);
  });

  it('Verifies runEngineV2FromDbRecord maps keys correctly', () => {
    const dbRecord = {
      field_5: 100, // Raw Materials
      field_6: 150, // Labor
      tax_19: 100,  // Monthly Units
      tax_30: 25,   // 25% target profit
    };

    const finalResult = runEngineV2FromDbRecord(dbRecord);

    // result should have field_8 (Total direct costs = 100+150=250)
    expect(finalResult.field_8).toBe(250);
    // Recommended price exists
    expect(finalResult.recommended_78).toBeDefined();
    expect(finalResult.recommended_78).toBeGreaterThan(0);
  });
});
