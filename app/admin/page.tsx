"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, Settings as SettingsIcon, Clock, Eye, EyeOff, X, ListPlus } from "lucide-react";
import { getUserProfile, updateProfile, type FieldConfigState } from "@/app/actions";
import { EXCEL_ROW_MAP } from "@/lib/excel-map";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Map of all fields to their status
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfigState>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    try {
      const profile = await getUserProfile();
      
      let configState: FieldConfigState = {};
      
      if (profile?.field_configs && Object.keys(profile.field_configs).length > 0) {
        // Use the new V2 JSON format
        configState = profile.field_configs;
      } else if (profile?.display_settings) {
        // Backwards compatibility migration from V1
        const ds = profile.display_settings;
        const inputs = new Set([...(ds.input_rows || []), ...(ds.monthly_rows || [])]);
        const outputs = new Set(ds.output_rows || []);
        
        Object.values(EXCEL_ROW_MAP).forEach(f => {
          if (inputs.has(f.rowIndex)) {
            configState[f.id] = { isVisible: true, isInput: true };
          } else if (outputs.has(f.rowIndex)) {
            configState[f.id] = { isVisible: true, isInput: false };
          } else {
            configState[f.id] = { isVisible: false, isInput: true };
          }
        });
      }

      setFieldConfigs(configState);
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת ההגדרות מ-Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedAuth = localStorage.getItem("admin_authed");
    if (storedAuth === "true") {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    void load();
  }, [authed]);

  const login = () => {
    setError(null);
    setSaveMessage(null);
    if (password === "ADMIN") {
      setAuthed(true);
      localStorage.setItem("admin_authed", "true");
      return;
    }
    setError("סיסמה שגויה");
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const fullConfigPayload: FieldConfigState = { ...fieldConfigs };
      Object.keys(EXCEL_ROW_MAP).forEach(id => {
        if (!fullConfigPayload[id]) {
          fullConfigPayload[id] = { isVisible: false, isInput: true };
        }
      });
      
      console.log('Sending to server:', fullConfigPayload);

      await updateProfile(fullConfigPayload);
      
      setSaveMessage("ההגדרות נשמרו בהצלחה ב-Supabase.");
      router.refresh(); // Clear Next.js cache
    } catch (e: any) {
      console.error(e);
      setError(`שגיאה בשמירה: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (id: string, updates: Partial<{ isVisible: boolean; isInput: boolean }>) => {
    setFieldConfigs(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { isVisible: false, isInput: true }),
        ...updates
      }
    }));
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

  // Pre-sort fields by row index for predictable display order
  const allFields = Object.values(EXCEL_ROW_MAP).sort((a, b) => a.rowIndex - b.rowIndex);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20" dir="rtl">
      <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl rounded-2xl sticky top-4 z-50">
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
              ניהול תצוגת מחשבון החכם
            </h2>
            <div className="flex items-center gap-3">
              <Button 
                onClick={save} 
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg transition-all"
              >
                {saving ? <Spinner className="w-4 h-4 mr-2" /> : "שמור שינויים"}
              </Button>
              <Link href="/" className="inline-flex items-center p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700">
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
          {saveMessage && <p className="text-sm text-green-600 text-center font-medium mt-2">{saveMessage}</p>}
          {error && <p className="text-sm text-red-600 text-center font-medium mt-2">{error}</p>}
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
          <Spinner className="w-8 h-8" />
          <p>טוען את מילון השדות מהמערכת...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allFields.map((field) => {
            const state = fieldConfigs[field.id] || { isVisible: false, isInput: true };
            
            return (
              <Card 
                key={field.id} 
                className={`transition-all duration-300 ${state.isVisible ? 'bg-white border-blue-100 shadow-md' : 'bg-gray-50/50 border-gray-100 opacity-60 grayscale'}`}
              >
                <CardContent className="p-4 flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                        שורה {field.rowIndex}
                      </span>
                      <button 
                        onClick={() => updateField(field.id, { isVisible: !state.isVisible })}
                        className={`p-1.5 rounded-full transition-colors ${state.isVisible ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-green-500 hover:bg-green-50'}`}
                        title={state.isVisible ? "הסתר שדה" : "הצג שדה"}
                      >
                        {state.isVisible ? <X className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <h3 className={`font-semibold text-sm ${state.isVisible ? 'text-gray-900' : 'text-gray-500'}`}>
                      {field.label}
                    </h3>
                    
                    {(field.description || field.hint) && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2" title={`${field.description} - ${field.hint}`}>
                        {field.description} {field.hint && `(${field.hint})`}
                      </p>
                    )}
                  </div>

                  {state.isVisible && (
                    <div className="flex bg-gray-100 p-1 rounded-xl mt-4">
                      <button
                        onClick={() => updateField(field.id, { isInput: true })}
                        className={`flex-1 text-xs py-1.5 rounded-lg transition-all font-medium ${state.isInput ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        קלט
                      </button>
                      <button
                        onClick={() => updateField(field.id, { isInput: false })}
                        className={`flex-1 text-xs py-1.5 rounded-lg transition-all font-medium ${!state.isInput ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        תוצאה
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

