"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { UserNameModal } from "@/components/user-name-modal";
import type { InputRow, OutputRow, CalculationInput } from "@/lib/google-sheets";
import { runCalculation } from "@/app/actions";

type Props = {
  initialInputs: InputRow[];
  initialOutputs: OutputRow[];
};

export function CalculatorForm({
  initialInputs,
  initialOutputs
}: Props) {
  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const [hasMounted, setHasMounted] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const [inputs, setInputs] = useState<
    { rowIndex: number; value: string; isPercentage: boolean }[]
  >(
    () =>
      initialInputs.map((i) => ({
        rowIndex: i.rowIndex,
        value: i.value ?? "",
        isPercentage: i.isPercentage
      }))
  );

  const [outputs, setOutputs] = useState<OutputRow[]>(initialOutputs || []);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Controls Mobile results drawer
  const [resultsOpen, setResultsOpen] = useState(false);

  useEffect(() => setHasMounted(true), []);

  const inputByRowIndex = useMemo(() => {
    const map = new Map<number, { value: string; isPercentage: boolean }>();
    for (const i of inputs) map.set(i.rowIndex, { value: i.value, isPercentage: i.isPercentage });
    return map;
  }, [inputs]);

  const handleUserConfirmed = useCallback((name: string) => {
    setUserName(name);
  }, []);

  const handleInputChange = (rowIndex: number, value: string) => {
    setInputs((prev) =>
      prev.map((i) => (i.rowIndex === rowIndex ? { ...i, value } : i))
    );
  };

  const calculate = async () => {
    setError(null);
    if (!userName) {
      setError("נא להזין שם משתמש.");
      return;
    }

    setSyncing(true);
    setResultsOpen(true);
    
    try {
      const payloadInputs: CalculationInput[] = inputs.map((i) => {
        const initial = initialInputs.find(init => init.rowIndex === i.rowIndex);
        return {
          rowIndex: i.rowIndex,
          label: initial?.label || "",
          description: initial?.description || "",
          value: i.value,
          isPercentage: i.isPercentage
        };
      });

      const res = await runCalculation({
        userName,
        inputs: payloadInputs
      });

      setOutputs(res.outputs);
      setInputs((prev) => prev.map((i) => ({ ...i, value: "" })));
      setLastUpdated(new Date().toLocaleTimeString("he-IL"));
    } catch (e) {
      console.error(e);
      setError("אירעה שגיאה בזמן החישוב. נא לנסות שוב.");
    } finally {
      setSyncing(false);
    }
  };

  if (!hasMounted) {
     return <div className="min-h-screen opacity-0" />;
  }

  return (
    <>
      <UserNameModal onConfirm={handleUserConfirmed} />

      <div className="pb-40 relative max-w-[1500px] mx-auto z-10">
        <div className="grid gap-8 lg:grid-cols-[3fr_1.5fr] items-start relative">
          
          {/* Inputs Column */}
          <div className="w-full">
             <div className="mb-6 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                  <Calculator className="w-6 h-6 text-blue-600" />
                  לוח נתונים
                </h2>
                {userName && <span className="text-sm text-slate-500 bg-white/50 px-4 py-1.5 rounded-full border border-white/60 shadow-sm block w-fit">שלום, {userName}</span>}
             </div>

             {initialInputs.length === 0 ? (
               <p className="text-sm text-gray-600 bg-white/60 backdrop-blur-md p-6 rounded-3xl text-center shadow-lg border border-white/40">
                 לא הוגדרו שורות קלט בלשונית `Settings`
               </p>
             ) : (
               <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                 {initialInputs.map((row) => {
                   const local = inputByRowIndex.get(row.rowIndex);
                   const value = local?.value ?? "";
                   return (
                     <motion.div 
                       variants={itemVariants} 
                       initial="hidden" 
                       whileInView="show" 
                       viewport={{ once: true, amount: 0.1 }}
                       key={row.rowIndex} 
                       className="group bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:shadow-blue-500/15 hover:-translate-y-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:shadow-[0_0_20px_rgba(26,115,232,0.3)] relative z-10 flex flex-col justify-between h-full"
                     >
                        <div className="space-y-4">
                          <Label className="text-right text-base text-slate-700 font-semibold block">
                            {row.label || ""}
                          </Label>

                          <div className="relative">
                            <Input
                              type="number"
                              step="any"
                              inputMode="decimal"
                              value={value}
                              disabled={syncing}
                              className="text-base sm:text-lg h-12 rounded-2xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all border-gray-200 focus:border-blue-400 pl-8"
                              onChange={(e) => handleInputChange(row.rowIndex, e.target.value)}
                              placeholder={row.isPercentage ? "לדוגמה: 25" : "הכנס ערך"}
                            />
                            {row.isPercentage && (
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 pointer-events-none">
                                %
                              </span>
                            )}
                          </div>
                          
                          {row.description && (
                            <p className="text-[12.5px] text-gray-500 text-right leading-relaxed">
                              {row.description}
                            </p>
                          )}
                        </div>

                        {row.hint && (
                          <div className="mt-5 pt-4 border-t border-gray-100/60">
                             <p className="text-[11.5px] italic text-gray-400 text-right">
                               {row.hint}
                             </p>
                          </div>
                        )}
                     </motion.div>
                   );
                 })}
               </motion.div>
             )}
             
             {error && (
               <div className="mt-6 bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 text-sm text-center shadow-sm">
                 {error}
               </div>
             )}
          </div>

          {/* Results Drawer */}
          <AnimatePresence mode="wait">
            {(outputs.length > 0 || syncing) && resultsOpen && (
              <motion.div
                key="results-drawer"
                initial={{ opacity: 0, x: "-100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "-100%" }}
                transition={{ type: "spring", bounce: 0.1, duration: 0.7 }}
                className="fixed inset-x-0 bottom-0 z-[90] bg-white/95 backdrop-blur-2xl p-6 sm:p-8 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-white/50 overflow-y-auto max-h-[85vh] lg:sticky lg:top-24 lg:bg-transparent lg:shadow-none lg:p-0 lg:rounded-none lg:border-none lg:max-h-none lg:overflow-visible transition-all"
              >
                <Card className="shadow-none border-none bg-transparent lg:shadow-2xl lg:border-white/60 lg:bg-gradient-to-b lg:from-white/90 lg:to-blue-50/50 lg:backdrop-blur-xl lg:rounded-3xl hover:shadow-indigo-900/10 transition-shadow duration-500 h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-4 lg:pb-6">
                    <CardTitle className="text-xl text-slate-800">תוצאות החישוב</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden -mr-2 text-gray-500 hover:bg-gray-100/50 rounded-full" 
                      onClick={() => setResultsOpen(false)}
                    >
                       <X className="w-5 h-5" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 pt-1">
                      {outputs.map((o) => (
                        <motion.div
                          variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
                          key={o.rowIndex}
                          className={`flex items-start justify-between border-b border-gray-100 pb-4 last:border-b-0 last:pb-0 ${syncing ? 'opacity-50 blur-[1px]' : ''} transition-all`}
                        >
                          <div className="flex flex-col max-w-[65%]">
                            <span className="text-sm font-semibold text-right text-slate-800 leading-snug">
                              {o.label || ""}
                            </span>
                            {o.description && (
                              <p className="text-[12px] text-gray-500 text-right mt-1.5 whitespace-pre-line leading-relaxed">
                                {o.description}
                              </p>
                            )}
                          </div>
                          <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 whitespace-nowrap pt-0.5">
                            {syncing ? (
                              <motion.div 
                                className="h-6 w-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-md"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                              />
                            ) : (
                              <span className="font-mono tracking-wider text-xl leading-tight">{o.value}</span>
                            )}
                          </div>
                        </motion.div>
                      ))}

                      {lastUpdated && !syncing && (
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-400">
                          <span>עודכן: {lastUpdated}</span>
                          <span className="flex items-center gap-1"><RefreshCcw className="w-3 h-3"/> 400ms</span>
                        </div>
                      )}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Floating Calculate Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[90%] sm:max-w-md px-4 pointer-events-none">
        <motion.div 
          className="bg-white/80 backdrop-blur-3xl border border-white/50 p-2 sm:p-2.5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(26,115,232,0.25)] flex flex-col items-center gap-1.5 pointer-events-auto"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
        >
          <Button
            className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] rounded-[2rem] h-14 sm:h-[4.25rem] text-lg sm:text-xl font-bold tracking-wide"
            onClick={calculate}
            disabled={syncing || initialInputs.length === 0}
          >
            {syncing && (
              <motion.div 
                className="absolute inset-0 bg-white/20 z-0 pointer-events-none"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {syncing ? (
                <>
                  <Spinner />
                  <span>מעבד נתונים...</span>
                </>
              ) : (
                <span>חשב תוצאות</span>
              )}
            </span>
          </Button>
        </motion.div>
      </div>
    </>
  );
}
