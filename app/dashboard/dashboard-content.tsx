"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, DollarSign, Target, PieChart, Activity, AlertCircle, Layers } from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  ReferenceLine,
  AreaChart,
  Area
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { calculateV2, EngineV2Inputs } from "@/lib/financial-engine-v2";

const COLORS = ["#3b82f6", "#8b5cf6", "#f43f5e", "#10b981", "#f59e0b"];

export function DashboardContent({ historyItems }: { historyItems: any[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    historyItems.length > 0 ? [historyItems[0].id] : []
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(historyItems.map(h => h.id));
  const deselectAll = () => setSelectedIds([]);

  if (!historyItems || historyItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-sm mx-auto">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
          <Activity className="w-10 h-10 text-slate-300" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">אין נתונים לניתוח</h2>
          <p className="text-slate-500 text-sm">בצע ושמור לפחות חישוב אחד כדי לראות את ה-Dashboard האסטרטגי.</p>
        </div>
        <Button onClick={() => window.location.href = '/'} className="rounded-xl px-8 h-12 bg-blue-600 hover:bg-blue-700 font-bold">
          למחשבון
        </Button>
      </div>
    );
  }

  // Ensure active selection doesn't break if items are deleted
  const selectedItems = historyItems.filter(h => selectedIds.includes(h.id));

  // --- MULTI-CALCULATION REDUCER (Aggregator) ---
  const consolidated = useMemo(() => {
    if (selectedItems.length === 0) return null;

    let totalRawMaterials = 0;
    let totalDirectLabor = 0;
    let totalOtherDirect = 0;
    let totalRent = 0;
    let totalUtilities = 0;
    let totalInsurance = 0;
    let totalAccounting = 0;
    let totalPension = 0;
    let totalCar = 0;
    let totalMarketing = 0;
    let totalOtherOverhead = 0;
    let totalMonthlyUnits = 0;
    let totalOtherVC = 0;
    let totalCompetitorPrice = 0;

    let maxNetProfitMargin = 0; // Fallback to safe value or latest

    // We will use the rates from the FIRST selected item (most recent by sort order)
    const baseItemIndex = 0;
    const baseRaw = selectedItems[baseItemIndex].inputs || selectedItems[baseItemIndex].outputs || {};
    
    // Fallback getter matching schema ids
    const safeGetRate = (key: string, defVal = 0) => {
        let v = Number(baseRaw[key]);
        if(isNaN(v) && key === "tax_26") v = 20; // Default tax
        if(isNaN(v) && key === "field_27") v = 16.61; // Default soc sec
        if(isNaN(v) && key === "field_28") v = 17; // Default vat
        return isNaN(v) ? defVal : v;
    };

    // Calculate individual sums using the mapped schema keys strictly
    for (const item of selectedItems) {
      const raw = item.inputs || item.outputs || {};
      
      const safe = (id: string) => isNaN(Number(raw[id])) ? 0 : Number(raw[id]);

      totalRawMaterials += safe("field_5");
      totalDirectLabor += safe("field_6");
      totalOtherDirect += safe("field_7");

      totalRent += safe("field_10");
      totalUtilities += safe("field_11");
      totalInsurance += safe("field_12");
      totalAccounting += safe("field_13");
      totalPension += safe("field_14");
      totalCar += safe("field_15");
      totalMarketing += safe("field_16");
      totalOtherOverhead += safe("field_17");

      totalOtherVC += safe("field_24");
      totalMonthlyUnits += safe("tax_19") || 0; 
      totalCompetitorPrice += safe("field_71");
    }

    const aggregatedInputs: EngineV2Inputs = {
      rawMaterials: totalRawMaterials,
      directLabor: totalDirectLabor,
      otherDirectCosts: totalOtherDirect,
      rent: totalRent,
      utilities: totalUtilities,
      insurance: totalInsurance,
      accounting: totalAccounting,
      pension: totalPension,
      carExpenses: totalCar,
      marketing: totalMarketing,
      otherOverhead: totalOtherOverhead,
      monthlyUnits: totalMonthlyUnits,
      otherVariableCostFixed: totalOtherVC,
      competitorPrice: totalCompetitorPrice > 0 ? (totalCompetitorPrice / selectedItems.length) : 0, // Average competitor price

      // Use Rates from most recent selected project (Safest deterministic method for mixed tax environments)
      commissionRate: safeGetRate("field_22") / 100,
      clearingRate: safeGetRate("field_23") / 100,
      incomeTaxRate: safeGetRate("tax_26") / 100,
      socialSecurityRate: safeGetRate("field_27") / 100,
      vatRate: safeGetRate("field_28") / 100,
      targetNetProfitMargin: safeGetRate("tax_30") / 100,
      safetyMarginRate: safeGetRate("field_66") / 100,
      badDebtRate: safeGetRate("field_67") / 100,
      financingAnnualRate: safeGetRate("field_68") / 100,
      customerCreditDays: safeGetRate("field_69"),
      supplierCreditDays: safeGetRate("tax_70"),
    };

    try {
      const results = calculateV2(aggregatedInputs);

      // Force zero out NaNs directly inside results
      Object.keys(results).forEach(key => {
        if (typeof results[key as keyof typeof results] === 'number' && isNaN(results[key as keyof typeof results] as any)) {
           (results as any)[key] = 0;
        }
      });

      return { inputs: aggregatedInputs, results };
    } catch (e) {
      console.error("Aggregation Math Failed:", e);
      return null; // Return null if math is fundamentally broken (e.g., pricing denominator NaN escape failed)
    }
  }, [selectedItems]);

  const renderToolbar = () => (
    <div className="bg-white/70 backdrop-blur-xl border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex flex-col gap-5 sticky top-0 z-[50]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
           <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
             <Layers className="w-7 h-7 text-indigo-600" />
             אסטרטגיה מאוחדת
           </h1>
           <p className="text-slate-500 text-sm font-medium">בחר פרויקטים לשילוב בדוח P&L רוחבי. {selectedIds.length} נבחרו מתוך {historyItems.length}.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={selectAll} className="h-8 rounded-lg text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50">בחר הכל</Button>
           <Button variant="ghost" size="sm" onClick={deselectAll} className="h-8 rounded-lg text-xs font-bold text-slate-500">נקה הכל</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 py-2 custom-scrollbar">
        <AnimatePresence>
          {historyItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <motion.button
                key={item.id}
                layout
                onClick={() => toggleSelection(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  isSelected 
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-600/20 ring-offset-1' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50'
                }`}
              >
                {item.project_name || item.title || "חישוב..."}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );

  if (!consolidated) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in zoom-in duration-700">
        {renderToolbar()}
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 text-center max-w-sm mx-auto">
          {selectedIds.length === 0 ? (
            <>
              <Layers className="w-16 h-16 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-800">תרכיב את הדוח שלך</h2>
              <p className="text-slate-500 text-sm">השתמש בסרגל הכלים למעלה כדי לסמן פרויקטים, והמערכת תיצור דוח מאוחד באופן אוטומטי.</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-800">שגיאת מנוע מאוחד</h2>
              <p className="text-slate-500 text-sm">לא ניתן לנתח מתמטית את שילוב הפרויקטים (נתונים חסרים או לא תואמים).</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const { results, inputs } = consolidated;

  // 1. Break-even Intersection Data (Consolidated)
  const beUnits = results.breakEvenUnits;
  const price = results.recommendedPriceNet; // Average Effective Target
  const fixed = results.totalMonthlyOverhead;
  const varCost = results.baseCost - (inputs.monthlyUnits > 0 ? (fixed / inputs.monthlyUnits) : 0);

  const chartData = [];
  const maxRange = Math.max(beUnits * 2, inputs.monthlyUnits * 1.5, 10);
  const step = maxRange / 10;
  
  for (let q = 0; q <= maxRange; q += step) {
    const qty = Math.round(q);
    chartData.push({
      units: qty,
      revenue: Math.round(qty * price),
      cost: Math.round(fixed + qty * varCost),
    });
  }

  // 2. Cost Breakdown Pie
  const pieData = [
    { name: 'עלויות ישירות (VC)', value: results.totalDirectCosts },
    { name: 'הוצאות קבועות', value: results.totalMonthlyOverhead },
    { name: 'מיסים והפרשות', value: results.incomeTaxAmount + results.socialSecurityAmount },
    { name: 'רווח נקי', value: results.netProfit },
  ];

  const ebitda = results.ebt; // For standard purposes here without D&A

  // Proof logging
  console.log("--- CONSOLIDATED DATA ---", {
    selectedCount: selectedItems.length,
    TotalRevenue: Math.round(inputs.monthlyUnits * price),
    EBITDA: ebitda,
    AggBreakEven: beUnits
  });

  return (
    <div className="space-y-8 pb-20 animate-in fade-in zoom-in duration-700">
      
      {/* Dynamic Multi-Select Header Layout */}
      {renderToolbar()}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div whileHover={{ y: -5 }} className="bg-white p-5 lg:p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
           <div className="absolute right-0 top-0 h-full w-1.5 bg-blue-500 rounded-r-xl" />
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">נקודת איזון כוללת</p>
           <p className="text-3xl font-black text-slate-900 tracking-tighter">{results.breakEvenUnits.toLocaleString('he-IL')} <span className="text-base text-slate-400 font-medium">יח'</span></p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-5 lg:p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center relative overflow-hidden">
           <div className="absolute right-0 top-0 h-full w-1.5 bg-indigo-500 rounded-r-xl" />
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">EBITDA מאוחד</p>
           <p className="text-3xl font-black text-slate-900 tracking-tighter">₪{Math.round(ebitda).toLocaleString('he-IL')}</p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-5 lg:p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center relative overflow-hidden">
           <div className="absolute right-0 top-0 h-full w-1.5 bg-emerald-500 rounded-r-xl" />
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">צפי הכנסות כולל</p>
           <p className="text-3xl font-black text-slate-900 tracking-tighter">₪{Math.round(inputs.monthlyUnits * price).toLocaleString('he-IL')}</p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-5 lg:p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center relative overflow-hidden">
           <div className="absolute right-0 top-0 h-full w-1.5 bg-amber-500 rounded-r-xl" />
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">שיעור רווח נקי משוקלל</p>
           <p className="text-3xl font-black text-slate-900 tracking-tighter">{((results.netProfit / (inputs.monthlyUnits * price || 1)) * 100).toFixed(1)}%</p>
        </motion.div>
      </div>

     {/* Profit & Loss Table Matrix */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/60 overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 p-6 sm:p-8">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                   <Target className="w-6 h-6 text-rose-500" />
                   דוח רווח והפסד (P&L) מאוחד
                </CardTitle>
                <CardDescription className="text-sm font-medium mt-1">תרגום הנתונים למבנה חשבונאי מאוחד</CardDescription>
              </div>
              <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold shadow-inner">
                 סה"כ יחידות מוערכות: {inputs.monthlyUnits.toLocaleString()}
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="w-full text-sm font-medium grid grid-cols-1">
             
             {/* Dynamic P&L Rows */}
             <div className="grid grid-cols-[1fr_auto] p-4 sm:p-6 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <span className="text-slate-600 font-bold">הכנסות</span>
                <span className="text-slate-900 font-black">₪{Math.round(inputs.monthlyUnits * price).toLocaleString()}</span>
             </div>

             <div className="grid grid-cols-[1fr_auto] p-4 sm:p-6 border-b text-slate-500 border-slate-100 hover:bg-slate-50/50 transition-colors pl-8">
                <span>פחות: עלויות משתנות</span>
                <span className="text-rose-500 font-bold">-₪{Math.round(inputs.monthlyUnits * varCost).toLocaleString()}</span>
             </div>

             <div className="grid grid-cols-[1fr_auto] p-4 sm:p-6 border-b-2 border-slate-200 bg-slate-50/80 transition-colors">
                <span className="text-slate-800 font-black text-base">מרווח תרומה</span>
                <span className="text-slate-900 font-black text-base">₪{Math.round(results.recContributionMargin * inputs.monthlyUnits).toLocaleString()}</span>
             </div>

             <div className="grid grid-cols-[1fr_auto] p-4 sm:p-6 border-b text-slate-500 border-slate-100 hover:bg-slate-50/50 transition-colors pl-8">
                <span>פחות: עלויות קבועות / תקורה</span>
                <span className="text-rose-500 font-bold">-₪{results.totalMonthlyOverhead.toLocaleString()}</span>
             </div>

             <div className="grid grid-cols-[1fr_auto] p-4 sm:p-6 border-b-2 border-slate-200 bg-indigo-50/30 transition-colors">
                <span className="text-indigo-900 font-black text-base flex items-center gap-2">רווח תפעולי (EBIT)</span>
                <span className="text-indigo-700 font-black text-lg">₪{Math.round(ebitda).toLocaleString()}</span>
             </div>

             <div className="grid grid-cols-[1fr_auto] p-4 sm:p-6 border-b text-slate-500 border-slate-100 hover:bg-slate-50/50 transition-colors pl-8">
                <span>פחות: מיסים והפרשות חובה</span>
                <span className="text-rose-500 font-bold">-₪{Math.round(results.incomeTaxAmount + results.socialSecurityAmount).toLocaleString()}</span>
             </div>

             <div className="grid grid-cols-[1fr_auto] p-5 sm:p-8 bg-gradient-to-l from-emerald-500 to-emerald-400 text-white shadow-inner">
                <span className="font-black text-lg sm:text-xl drop-shadow-sm">רווח נקי</span>
                <span className="font-black text-2xl sm:text-3xl drop-shadow-md">₪{Math.round(results.netProfit).toLocaleString()}</span>
             </div>

           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Consolidated Break-even Chart */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/60 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-600" /> נקודת איזון מצרפית (Aggregated BEP)</CardTitle>
            <CardDescription className="text-xs">הצטלבות הכנסות מול סך עלויות למערך המלא</CardDescription>
          </CardHeader>
          <CardContent className="p-8 h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="units" label={{ value: 'יחידות (משוקלל)', position: 'insideBottom', offset: -10 }} stroke="#94a3b8" fontSize={12} />
                  <YAxis tickFormatter={(val) => `₪${val/1000}k`} stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    formatter={(val) => [`₪${val}`, ""]}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Area type="monotone" dataKey="revenue" name="פדיון" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="cost" name="עלויות" stroke="#f43f5e" strokeWidth={3} fillOpacity={0} />
                  <ReferenceLine x={beUnits} stroke="#64748b" strokeDasharray="5 5" label={{ value: 'BEP', position: 'top', fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                </AreaChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/60 overflow-hidden">
           <CardHeader className="p-8 pb-4">
             <CardTitle className="text-xl flex items-center gap-2"><PieChart className="w-5 h-5 text-emerald-600" /> התפלגות עלויות מצרפית</CardTitle>
           </CardHeader>
           <CardContent className="p-0 h-[320px]">
             <ResponsiveContainer width="100%" height="100%">
               <RePieChart>
                 <Pie
                   data={pieData}
                   cx="50%"
                   cy="50%"
                   innerRadius={70}
                   outerRadius={110}
                   paddingAngle={4}
                   dataKey="value"
                 >
                   {pieData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={{ borderRadius: '15px' }} />
                 <Legend />
               </RePieChart>
             </ResponsiveContainer>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
