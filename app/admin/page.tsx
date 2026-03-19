"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { loadSettings, updateSettings } from "@/app/actions";
import { parseRowList } from "@/lib/row-parsing";
import type { SettingsConfig } from "@/lib/google-sheets";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [inputRowsStr, setInputRowsStr] = useState("");
  const [outputRowsStr, setOutputRowsStr] = useState("");
  const [percentageRowsStr, setPercentageRowsStr] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    try {
      const s: SettingsConfig = await loadSettings();
      setInputRowsStr(s.inputRows.join(","));
      setOutputRowsStr(s.outputRows.join(","));
      setPercentageRowsStr(s.percentageRows.join(","));
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת ההגדרות מ-Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authed) return;
    void load();
  }, [authed]);

  const login = () => {
    setError(null);
    setSaveMessage(null);
    if (password === "ADMIN") {
      setAuthed(true);
      return;
    }
    setError("סיסמה שגויה");
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      await updateSettings({
        inputRows: parseRowList(inputRowsStr),
        outputRows: parseRowList(outputRowsStr),
        percentageRows: parseRowList(percentageRowsStr)
      });
      setSaveMessage("ההגדרות נשמרו בהצלחה.");
      await load();
    } catch (e) {
      console.error(e);
      setError("שגיאה בשמירת ההגדרות.");
    } finally {
      setSaving(false);
    }
  };

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto" dir="rtl">
        <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl rounded-2xl">
          <CardHeader>
            <CardTitle>כניסת מנהל</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-right">
              להזנת/עריכת ההגדרות נדרשת סיסמת מנהל.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-800 block text-right">
                סיסמה
              </label>
              <Input
                type="password"
                value={password}
                disabled={loading}
                className="text-base sm:text-sm rounded-2xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all border-gray-200 focus:border-blue-400"
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                autoComplete="off"
                data-1p-ignore
              />
            </div>
            {error ? (
              <p className="text-sm text-red-600 text-right">{error}</p>
            ) : null}
            <div className="flex justify-end pt-2">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-blue-600/50 rounded-2xl" onClick={login} disabled={loading}>
                כניסה
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl rounded-2xl">
        <CardHeader>
          <CardTitle>ניהול הגדרות מחשבון</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Spinner />
              <span>טוען הגדרות...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800 block text-right">
                  שורות קלט (למשל: 19-22, 25)
                </label>
                <Input
                  value={inputRowsStr}
                  disabled={saving}
                  className="text-base sm:text-sm rounded-2xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all border-gray-200 focus:border-blue-400"
                  onChange={(e) => setInputRowsStr(e.target.value)}
                  placeholder="לדוגמה: 19-22, 25"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800 block text-right">
                  שורות תוצאה
                </label>
                <Input
                  value={outputRowsStr}
                  disabled={saving}
                  className="text-base sm:text-sm rounded-2xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all border-gray-200 focus:border-blue-400"
                  onChange={(e) => setOutputRowsStr(e.target.value)}
                  placeholder="לדוגמה: 10,11-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800 block text-right">
                  שורות אחוזים
                </label>
                <Input
                  value={percentageRowsStr}
                  disabled={saving}
                  className="text-base sm:text-sm rounded-2xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all border-gray-200 focus:border-blue-400"
                  onChange={(e) => setPercentageRowsStr(e.target.value)}
                  placeholder="לדוגמה: 4,7-9"
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600 text-right">{error}</p>
              ) : null}
              {saveMessage ? (
                <p className="text-sm text-green-600 text-right">{saveMessage}</p>
              ) : null}

              <div className="flex justify-end pt-2 mt-4 sm:mt-2">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-blue-600/50 rounded-2xl" onClick={save} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner />
                      <span>שומר...</span>
                    </>
                  ) : (
                    <span>שמור הגדרות</span>
                  )}
                </Button>
              </div>
            </>
          )}
          <p className="text-xs text-gray-500 text-right">
            טיפ: אפשר להזין גם טווחים כמו <span className="font-medium">19-22</span> וגם ערכים בודדים.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

