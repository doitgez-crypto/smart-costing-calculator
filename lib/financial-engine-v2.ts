export interface EngineV2Inputs {
  rawMaterials: number;
  directLabor: number;
  otherDirectCosts: number;
  rent: number;
  utilities: number;
  insurance: number;
  accounting: number;
  pension: number;
  carExpenses: number;
  marketing: number;
  otherOverhead: number;
  monthlyUnits: number;
  commissionRate: number;
  clearingRate: number;
  otherVariableCostFixed: number;
  incomeTaxRate: number;
  socialSecurityRate: number;
  vatRate: number;
  targetNetProfitMargin: number;
  safetyMarginRate: number;
  badDebtRate: number;
  financingAnnualRate: number;
  customerCreditDays: number;
  supplierCreditDays: number;
  competitorPrice: number;
}

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateV2(inputs: EngineV2Inputs) {
  const i = { ...inputs };

  // כאן המנוע עובד עם ערכים עשרוניים
  const comm = i.commissionRate;
  const clear = i.clearingRate;
  const incTax = i.incomeTaxRate;
  const socSec = i.socialSecurityRate;
  const target = i.targetNetProfitMargin;
  const vat = i.vatRate;
  const safety = i.safetyMarginRate;
  const badDebt = i.badDebtRate;
  const finAnnualRate = i.financingAnnualRate;

  const totalDirectCosts = round2(i.rawMaterials + i.directLabor + i.otherDirectCosts);

  const totalMonthlyOverhead = round2(
    i.rent +
    i.utilities +
    i.insurance +
    i.accounting +
    i.pension +
    i.carExpenses +
    i.marketing +
    i.otherOverhead
  );

  const overheadPerUnit = round2(i.monthlyUnits > 0 ? totalMonthlyOverhead / i.monthlyUnits : 0);

  const baseCost = round2(totalDirectCosts + overheadPerUnit + i.otherVariableCostFixed);

  const taxFactor = (1 - incTax) * (1 - socSec);
  const pricingDenominator = (1 - comm - clear) * taxFactor - target;

  if (pricingDenominator <= 0) {
    throw new Error("יעד רווח לא ריאלי");
  }

  const targetPriceNet = round2((baseCost * taxFactor) / pricingDenominator);
  const vatAmount = round2(targetPriceNet * vat);
  const targetPriceInclVat = round2(targetPriceNet + vatAmount);

  const grossProfit = round2(targetPriceNet - totalDirectCosts);
  const contributionMargin = round2(
    targetPriceNet - totalDirectCosts - i.otherVariableCostFixed - (comm + clear) * targetPriceNet
  );
  const ebit = round2(contributionMargin - overheadPerUnit);
  const ebt = round2(ebit);
  const incomeTaxAmount = round2(-ebt * incTax);
  const socialSecurityAmount = round2(-ebt * (1 - incTax) * socSec);
  const netProfit = round2(ebt * taxFactor);

  const minOperationalPrice = round2(
    (baseCost * taxFactor) / ((1 - comm - clear) * taxFactor)
  );

  const targetPriceRaw = targetPriceNet;

  const recommendedPriceNet = round2(
    targetPriceRaw * (1 + safety) + targetPriceRaw * badDebt
  );

  const premiumPrice = round2(recommendedPriceNet * 1.1);

  const marketGapAmount = round2(i.competitorPrice > 0 ? recommendedPriceNet - i.competitorPrice : 0);
  const marketGapPercent = i.competitorPrice > 0 ? marketGapAmount / i.competitorPrice : 0;

  const netFinancingDays = round2(i.customerCreditDays - i.supplierCreditDays);
  const financingCost = round2(recommendedPriceNet * finAnnualRate * (netFinancingDays / 365));
  const badDebtCost = round2(recommendedPriceNet * badDebt);

  const ebtAfterFinancing = round2(ebt - financingCost - badDebtCost);
  const netProfitAfterFinancing = round2(ebtAfterFinancing * taxFactor);

  const recGrossProfit = round2(recommendedPriceNet - totalDirectCosts);
  const recContributionMargin = round2(
    recommendedPriceNet - totalDirectCosts - i.otherVariableCostFixed - (comm + clear) * recommendedPriceNet
  );
  const recEbit = round2(recContributionMargin - overheadPerUnit);
  const recEbt = round2(recEbit);
  const recNetProfit = round2(recEbt * taxFactor);
  const recNetProfitAfterFinancing = round2((recEbt - financingCost - badDebtCost) * taxFactor);

  const recommendedPriceInclVat = round2(recommendedPriceNet * (1 + vat));
  const actualNetProfitPercent = recommendedPriceNet > 0 ? recNetProfit / recommendedPriceNet : 0;

  return {
    totalDirectCosts,
    totalMonthlyOverhead,
    overheadPerUnit,
    baseCost,
    taxFactor: Number(taxFactor.toFixed(5)),
    pricingDenominator: Number(pricingDenominator.toFixed(5)),
    targetPriceNet,
    targetPriceRaw,
    minOperationalPrice,
    recommendedPriceNet,
    premiumPrice,
    vatAmount,
    targetPriceInclVat,
    grossProfit,
    contributionMargin,
    ebit,
    ebt,
    incomeTaxAmount,
    socialSecurityAmount,
    netProfit,
    marketGapAmount,
    marketGapPercent,
    netFinancingDays,
    financingCost,
    badDebtCost,
    ebtAfterFinancing,
    netProfitAfterFinancing,
    recGrossProfit,
    recContributionMargin,
    recEbit,
    recEbt,
    recNetProfit,
    recNetProfitAfterFinancing,
    recommendedPriceInclVat,
    actualNetProfitPercent
  };
}

export function runEngineV2FromDbRecord(dbRecord: Record<string, any>) {
  const safeGet = (id: string, def = 0) => {
    const val = Number(dbRecord[id]);
    return Number.isNaN(val) ? def : val;
  };

  // המשתמש מקליד אחוזים רגילים, לכן כאן ממירים לשבר עשרוני
  const protectedIncomeTax = safeGet("tax_26") || 20;
  const protectedSocialSecurity = safeGet("field_27") || 16.61;
  const protectedVatRate = safeGet("field_28") || 18;

  const inputs: EngineV2Inputs = {
    rawMaterials: safeGet("field_5"),
    directLabor: safeGet("field_6"),
    otherDirectCosts: safeGet("field_7"),
    rent: safeGet("field_10"),
    utilities: safeGet("field_11"),
    insurance: safeGet("field_12"),
    accounting: safeGet("field_13"),
    pension: safeGet("field_14"),
    carExpenses: safeGet("field_15"),
    marketing: safeGet("field_16"),
    otherOverhead: safeGet("field_17"),
    monthlyUnits: safeGet("tax_19", 0),

    commissionRate: safeGet("field_22") / 100,
    clearingRate: safeGet("field_23") / 100,
    otherVariableCostFixed: safeGet("field_24"),

    incomeTaxRate: protectedIncomeTax / 100,
    socialSecurityRate: protectedSocialSecurity / 100,
    vatRate: protectedVatRate / 100,
    targetNetProfitMargin: safeGet("tax_30") / 100,
    safetyMarginRate: safeGet("field_66") / 100,
    badDebtRate: safeGet("field_67") / 100,
    financingAnnualRate: safeGet("field_68") / 100,

    customerCreditDays: safeGet("field_69"),
    supplierCreditDays: safeGet("tax_70"),
    competitorPrice: safeGet("field_71"),
  };
  
  console.log("dbRecord before calc", dbRecord);
  console.log("raw tax_19", dbRecord?.tax_19);
  console.log("mapped monthlyUnits", inputs.monthlyUnits);
  
  const r = calculateV2(inputs);

  console.log("monthlyUnits", inputs.monthlyUnits);
  console.log("totalMonthlyOverhead", r.totalMonthlyOverhead);
  console.log("overheadPerUnit", r.overheadPerUnit);
  console.log("baseCost", r.baseCost);

  return {
    ...dbRecord,
    tax_19: inputs.monthlyUnits, // Reflecting exact fallback value back to UI to end 0.00 displays
    field_8: r.totalDirectCosts,
    field_18: r.totalMonthlyOverhead,
    field_20: r.overheadPerUnit,
    field_32: r.baseCost,
    tax_33: r.taxFactor,
    tax_34: r.pricingDenominator,

    recommended_35: r.targetPriceNet,
    tax_36: r.vatAmount,
    field_37: r.targetPriceInclVat,

    field_40: r.grossProfit,
    field_41: r.contributionMargin,
    field_42: r.ebit,
    tax_43: r.ebt,
    tax_44: r.incomeTaxAmount,
    field_45: r.socialSecurityAmount,
    tax_46: r.netProfit,

    min_76: r.minOperationalPrice,
    target_77: r.targetPriceRaw,
    recommended_78: r.recommendedPriceNet,
    field_79: r.premiumPrice,

    field_82: r.marketGapAmount,
    field_83: r.marketGapPercent,

    field_87: r.netFinancingDays,
    field_88: r.financingCost,
    field_89: r.badDebtCost,
    tax_90: r.ebtAfterFinancing,
    tax_91: r.netProfitAfterFinancing,

    recommended_105: r.recGrossProfit,
    recommended_106: r.recContributionMargin,
    recommended_107: r.recEbit,
    tax_108: r.recEbt,
    tax_109: r.recNetProfit,
    net_profit_110: r.recNetProfitAfterFinancing,

    recommended_114: r.recommendedPriceNet,
    recommended_115: r.recommendedPriceInclVat,
    recommended_116: r.actualNetProfitPercent
  };
}