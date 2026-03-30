"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BarChart3, TrendingUp, DollarSign, Target, PieChart, Activity, AlertCircle, Database, AlertTriangle } from "lucide-react";
import { getCalculations } from "@/lib/actions/calculations";
import { calculateV2, EngineV2Inputs } from "@/lib/financial-engine-v2";
import { isDatabaseConfigured } from "@/app/actions";
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
import { motion } from "framer-motion";

const COLORS = ["#3b82f6", "#8b5cf6", "#f43f5e", "#10b981", "#f59e0b"];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDbLinked, setIsDbLinked] = useState(true);

  useEffect(() => {
    async function load() {
      const dbStatus = await isDatabaseConfigured();
      setIsDbLinked(dbStatus);
      
      if (dbStatus) {
        const history = await getCalculations();
        if (history && history.length > 0) {
          const latest = history[0];
          const results = calculateV2(latest.inputs as unknown as EngineV2Inputs);
          setData({ history: latest, results, inputs: latest.inputs });
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-slate-500 font-medium">מעבד ניתוח אסטרטגי...</p>
      </div>
    );
  }

  if (!isDbLinked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center text-rose-500 relative">
          <PieChart className="w-12 h-12" />
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
             <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-900 leading-tight">דרוש חיבור למסד נתונים</h2>
          <p className="text-slate-500 text-lg font-medium">הניתוח האסטרטגי מתבסס על היסטוריית החישובים שלך. כדי להפעיל אותו, יש להגדיר <code className="bg-slate-100 px-1 rounded">DATABASE_URL</code> בקבצי המערכת.</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-right w-full">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">צעדים להפעלת הדשבורד:</p>
           <ul className="space-y-3 text-sm text-slate-600 font-medium">
             <li className="flex items-center gap-3 text-slate-400 line-through"><span>1</span> הקמת Database (Supabase)</li>
             <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">2</span> עדכון <code className="bg-slate-200 px-1.5 py-0.5 rounded text-rose-600">.env.local</code></li>
             <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">3</span> הרצת <code className="bg-slate-200 px-1.5 py-0.5 rounded">npx prisma migrate dev</code></li>
           </ul>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => window.location.href = '/'} className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-all active:scale-95">
            חזרה למחשבון
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-sm mx-auto">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
          <Activity className="w-10 h-10 text-slate-300" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">אין נתונים לניתוח</h2>
          <p className="text-slate-500 text-sm">בצע ושמור לפחות חישוב אחד כדי לראות את ה-Dashboard האסטרטגי שלך.</p>
        </div>
        <Button onClick={() => window.location.href = '/'} className="rounded-xl px-8 h-12 bg-blue-600 hover:bg-blue-700 font-bold">
          למחשבון
        </Button>
      </div>
    );
  }

  const { results, inputs } = data;

  // 1. Break-even Intersection Data
  // Revenue = Q * Price
  // Total Cost = Fixed + Q * VarCost
  const beUnits = results.breakEvenUnits;
  const price = results.recommendedPriceNet;
  const fixed = results.totalMonthlyOverhead;
  const varCost = results.baseCost - results.overheadPerUnit; // Simple approximation for visualization

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
    { name: 'עלויות ישירות', value: results.totalDirectCosts },
    { name: 'הוצאות קבועות', value: results.overheadPerUnit },
    { name: 'מיסים והפרשות', value: results.incomeTaxAmount + results.socialSecurityAmount },
    { name: 'רווח נקי', value: results.netProfit },
  ];

  // 3. Sensitivity Analysis Data
  // Highlighting elasticity
  const sensitivityData = [
    { name: 'חומרי גלם', impact: (results.sensitivity.rawMaterials * 100).toFixed(1) },
    { name: 'שכר עבודה', impact: (results.sensitivity.directLabor * 100).toFixed(1) },
    { name: 'מחיר מתחרה', impact: (results.sensitivity.competitorPrice * 100).toFixed(1) },
  ].sort((a,b) => Math.abs(Number(b.impact)) - Math.abs(Number(a.impact)));

  return (
    <div className="space-y-8 pb-20 animate-in fade-in zoom-in duration-1000">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
             <BarChart3 className="w-8 h-8 text-blue-600" />
             ניתוח אסטרטגי
          </h1>
          <p className="text-slate-500 font-medium">ניתוח מעמיק עבור: <span className="text-blue-600">{data.history.title}</span></p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
           <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
           DATA ENGINE V2 ACTIVE
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-5">
           <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Target className="w-7 h-7" />
           </div>
           <div>
              <p className="text-sm font-bold text-slate-500">נקודת איזון (יחידות)</p>
              <p className="text-3xl font-black text-slate-900">{results.breakEvenUnits}</p>
           </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-5">
           <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-7 h-7" />
           </div>
           <div>
              <p className="text-sm font-bold text-slate-500">מרווח ביטחון (%)</p>
              <p className="text-3xl font-black text-slate-900">{results.safetyMarginPercent}%</p>
           </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-5">
           <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <DollarSign className="w-7 h-7" />
           </div>
           <div>
              <p className="text-sm font-bold text-slate-500">רווח נקי ליחידה</p>
              <p className="text-3xl font-black text-slate-900">{results.netProfitPerUnit} ₪</p>
           </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Break-even Chart */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/60 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /> ניתוח נקודת איזון</CardTitle>
            <CardDescription>הצטלבות הכנסות מול סך עלויות</CardDescription>
          </CardHeader>
          <CardContent className="p-8 h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="units" label={{ value: 'כמות יחידות', position: 'insideBottom', offset: -10 }} stroke="#94a3b8" fontSize={12} />
                  <YAxis tickFormatter={(val) => `₪${val/1000}k`} stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    formatter={(val) => [`₪${val}`, ""]}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Area type="monotone" dataKey="revenue" name="פדיון כולל" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="cost" name="עלות כוללת" stroke="#f43f5e" strokeWidth={3} fillOpacity={0} />
                  <ReferenceLine x={beUnits} stroke="#64748b" strokeDasharray="5 5" label={{ value: 'BEP', position: 'top', fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                </AreaChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Breakdown & Elasticity */}
        <div className="space-y-8">
           <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/60 h-[calc(50%-1rem)]">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-xl flex items-center gap-2"><PieChart className="w-5 h-5 text-indigo-600" /> התפלגות עלויות</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
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

           <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/60 h-[calc(50%-1rem)]">
              <CardHeader className="p-8">
                <CardTitle className="text-xl flex items-center gap-2"><Activity className="w-5 h-5 text-rose-500" /> ניתוח רגישות (±5%)</CardTitle>
                <CardDescription>השפעה על הרווח הנקי</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="space-y-6">
                  {sensitivityData.map((item, idx) => {
                    const impact = Number(item.impact);
                    const isPositive = impact > 0;
                    const absImpact = Math.abs(impact);
                    // Elasticity highlight: if it's the highest impact
                    const isMostElastic = idx === 0;

                    return (
                      <div key={item.name} className={`space-y-2 p-4 rounded-3xl transition-all ${isMostElastic ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-slate-50'}`}>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-700">{item.name} {isMostElastic && <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full mr-2 uppercase tracking-tighter">Elastic</span>}</span>
                          <span className={`font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {isPositive ? '+' : ''}{item.impact}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(absImpact * 5, 100)}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              className={`h-full ${isMostElastic ? 'bg-rose-500' : 'bg-slate-400'}`} 
                           />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex items-center gap-2 p-3 bg-amber-50 rounded-2xl text-[11px] text-amber-700 border border-amber-100 italic">
                   <AlertCircle className="w-4 h-4 flex-shrink-0" />
                   ניתן לראות כי {sensitivityData[0].name} הוא הרכיב בעל הרגישות הגבוהה ביותר לרווחיות שלך.
                </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
