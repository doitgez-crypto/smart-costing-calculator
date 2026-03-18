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

  const [outputs, setOutputs] = useState<OutputRow[]>(initialOutputs);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    setOutputs(initialOutputs);
  }, [initialOutputs]);

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
    try {
      const payloadInputs: CalculationInput[] = inputs.map((i) => ({
        rowIndex: i.rowIndex,
        value: i.value,
        isPercentage: i.isPercentage
      }));

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
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
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
                            <p className="text-xs text-gray-500 text-right">
                              {row.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-gray-400 pt-2 whitespace-nowrap">
                          #{row.rowIndex}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={value}
                          disabled={syncing}
                          onChange={(e) =>
                            handleInputChange(row.rowIndex, e.target.value)
                          }
                          placeholder={
                            row.isPercentage ? "לדוגמה: 25 עבור 25%" : "הכנס ערך"
                          }
                        />
                        {row.isPercentage ? (
                          <span className="text-sm text-gray-700 whitespace-nowrap">
                            %
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {error ? (
                  <p className="text-sm text-red-600 text-right">{error}</p>
                ) : null}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    onClick={calculate}
                    disabled={syncing || initialInputs.length === 0}
                  >
                    {syncing ? (
                      <>
                        <Spinner />
                        <span>מחשב ומסנכרן...</span>
                      </>
                    ) : (
                      <span>Calculate</span>
                    )}
                  </Button>

                  <div className="flex items-center gap-2 text-xs text-gray-500 whitespace-nowrap rtl:flex-row-reverse">
                    <RefreshCcw className="w-3 h-3" />
                    <span>עיכוב 850ms מול Sheets</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תוצאות</CardTitle>
          </CardHeader>
          <CardContent>
            {initialOutputs.length === 0 ? (
              <p className="text-sm text-gray-600 text-right">
                לא הוגדרו שורות פלט בלשונית `Settings` (B2 ריק).
              </p>
            ) : (
              <div className="space-y-3">
                {outputs.map((o) => (
                  <div
                    key={o.rowIndex}
                    className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium">
                        {o.label || `שורה ${o.rowIndex}`}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        #{o.rowIndex}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-blue-700">
                      {o.value}
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

