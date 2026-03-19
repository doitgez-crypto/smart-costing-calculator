"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { UserNameModal } from "@/components/user-name-modal";
import type { InputRow, OutputRow } from "@/lib/google-sheets";
import { runCalculation } from "@/app/actions";
import type { CalculationInput } from "@/lib/google-sheets";

type Props = {
  initialInputs: InputRow[];
  initialOutputs: OutputRow[];
};

export function CalculatorForm({
  initialInputs,
  initialOutputs
}: Props) {
  const [userName, setUserName] = useState<string | null>(null);

  const [inputs, setInputs] = useState<
    { rowIndex: number; value: string; isPercentage: boolean }[]
  >(
    () =>
      initialInputs.map((i) => ({
        rowIndex: i.rowIndex,
        value: i.value ?? "",
        isPercentage: i.isPercentage
      })) // initial values already include %->display conversion
  );

  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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
    // Keep old outputs values for optimistic UI skeleton rendering.
    try {
      const payloadInputs: CalculationInput[] = inputs.map((i) => {
        const initial = initialInputs.find(init => init.rowIndex === i.rowIndex);
        return {
          rowIndex: i.rowIndex,
          label: initial?.label || `שורה ${i.rowIndex}`,
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

  return (
    <>
      <UserNameModal onConfirm={handleUserConfirmed} />

      <div className="grid gap-6 md:grid-cols-[2fr_1.1fr]">
        <Card className="shadow-xl border-white/60 bg-white/80 backdrop-blur-xl rounded-2xl transition-shadow duration-500 hover:shadow-2xl hover:shadow-blue-900/10">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              קלט חישוב
            </CardTitle>
            {userName ? (
              <div className="text-xs text-gray-500 whitespace-nowrap">
                משתמש: {userName}
              </div>
            ) : (
              <div className="text-xs text-gray-500 whitespace-nowrap">
                אנא הזן שם למעלה
              </div>
            )}
          </CardHeader>
          <CardContent>
            {initialInputs.length === 0 ? (
              <p className="text-sm text-gray-600 text-right">
                לא הוגדרו שורות קלט בלשונית `Settings` (B1 ריק).
              </p>
            ) : (
              <div className="space-y-5">
                {initialInputs.map((row) => {
                  const local = inputByRowIndex.get(row.rowIndex);
                  const value = local?.value ?? "";
                  return (
                    <div key={row.rowIndex} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col">
                          <Label className="text-right">
                            {row.label || `שורה ${row.rowIndex}`}
                          </Label>
                          {row.description ? (
                            <p className="text-[12px] italic text-gray-500 text-right mt-0.5">
                              {row.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={value}
                            disabled={syncing}
                            className="text-base sm:text-sm rounded-2xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all border-gray-200 focus:border-blue-400"
                            onChange={(e) =>
                              handleInputChange(row.rowIndex, e.target.value)
                            }
                            placeholder={
                              row.isPercentage
                                ? "לדוגמה: 25 עבור 25%"
                                : "הכנס ערך"
                            }
                          />
                          {row.isPercentage ? (
                            <span className="text-sm text-gray-700 whitespace-nowrap">
                              %
                            </span>
                          ) : null}
                        </div>

                        {row.hint ? (
                          <p className="text-[12px] italic text-gray-500 text-right">
                            {row.hint}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {error ? (
                  <p className="text-sm text-red-600 text-right">{error}</p>
                ) : null}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-2 pt-4 sm:pt-2">
                  <Button
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-blue-600/50 hover:-translate-y-0.5 rounded-2xl"
                    onClick={calculate}
                    disabled={syncing || initialInputs.length === 0}
                  >
                    {syncing ? (
                      <>
                        <Spinner />
                        <span>מחשב ומסנכרן...</span>
                      </>
                    ) : (
                      <span>חשב</span>
                    )}
                  </Button>

                  <div className="flex items-center gap-2 text-xs text-gray-500 whitespace-nowrap rtl:flex-row-reverse">
                    <RefreshCcw className="w-3 h-3" />
                    <span>עיכוב 400ms מול Sheets</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl border-white/60 bg-gradient-to-b from-white/90 to-blue-50/50 backdrop-blur-xl rounded-2xl transition-shadow duration-500 hover:shadow-2xl hover:shadow-indigo-900/10">
          <CardHeader>
            <CardTitle>תוצאות</CardTitle>
          </CardHeader>
          <CardContent>
            {initialOutputs.length === 0 ? (
              <p className="text-sm text-gray-600 text-right">
                לא הוגדרו שורות פלט בלשונית `Settings` (B2 ריק).
              </p>
            ) : outputs.length === 0 && !syncing ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-sm">
                <span className="bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 px-5 py-2.5 rounded-full border border-indigo-100 shadow-sm">
                  הזן נתונים ולחץ על חישוב לקבלת תוצאות
                </span>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {(outputs.length > 0 ? outputs : initialOutputs).map((o) => (
                  <div
                    key={o.rowIndex}
                    className={`flex items-start justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 ${syncing ? 'opacity-60' : ''}`}
                  >
                    <div className="flex flex-col max-w-[70%]">
                      <span className="text-sm font-medium text-right">
                        {o.label || `שורה ${o.rowIndex}`}
                      </span>
                      {o.description ? (
                        <p className="text-[12px] italic text-gray-500 text-right mt-0.5 whitespace-pre-line">
                          {o.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 whitespace-nowrap pt-0.5">
                      {syncing ? (
                        <div className="h-5 w-14 bg-gray-100 rounded-md animate-pulse" />
                      ) : (
                        o.value
                      )}
                    </div>
                  </div>
                ))}

                {lastUpdated ? (
                  <p className="text-[11px] text-gray-400 text-right pt-3 border-t border-gray-100">
                    עודכן לאחרונה: {lastUpdated}
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

