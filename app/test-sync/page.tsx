"use client";

import { useState } from "react";
import { runComparativeTest, type TestResultDiff } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, CheckCircle, Download, Play, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function TestSyncPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    discrepancies: TestResultDiff[];
    totalCompared: number;
    mockDbRecord: Record<string, number>;
  } | null>(null);

  const runTest = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await runComparativeTest();
      setResults(res as any);
    } catch (e) {
      console.error(e);
      alert("Error occurred while running tests: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (!results) return;

    let csv = "Row,Label,V1_Excel,V2_Local,Difference,Status\n";
    results.discrepancies.forEach(d => {
      csv += `${d.rowIndex},"${d.label}",${d.v1Value},${d.v2Value},${d.diff},${d.status}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `engine_v2_diff_report_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20" dir="rtl">
      <Card className="shadow-xl rounded-2xl border-white/60 bg-white/80 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <RefreshCcw className="w-6 h-6 text-blue-600" />
            מערכת בקרת איכות: V1 vs V2
          </CardTitle>
          <div className="flex gap-2">
            <Link href="/admin">
              <Button variant="outline" className="rounded-xl">חזרה לניהול</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600">
            דף זה מריץ במקביל את מנוע ה-Excel (V1) ואת מנוע ה-TypeScript (V2) על נתוני דוגמה זהים ומשווה את התוצאות שלהם רכיב אחר רכיב. אם קיים פער של מעל ל-1.00 ש״ח (כדי להכיל ענייני עיגולים באגורות), המערכת תציג התראה אדומה.
          </p>

          <div className="flex justify-center py-4">
            <Button 
              size="lg" 
              onClick={runTest} 
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg w-full sm:w-auto px-8"
            >
              {loading ? <Spinner className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 ml-2" />}
              {loading ? "מבצע בדיקה מול 2 המנועים..." : "הרץ בדיקת מנוע מקיפה"}
            </Button>
          </div>

          {results && (
            <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-gray-800">
                    {results.discrepancies.filter(d => d.status === "ERROR").length}
                  </div>
                  <div className="text-sm text-gray-500">שגיאות<br/>קריטיות</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-500 text-left">מתוך<br/>שדות שחושבו</div>
                  <div className="text-3xl font-bold text-gray-800">
                    {results.totalCompared}
                  </div>
                </div>
              </div>

              {results.discrepancies.length === 0 ? (
                <div className="p-8 bg-green-50/50 border border-green-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                  <h3 className="text-xl font-bold text-green-800">התאמה מלאה!</h3>
                  <p className="text-green-600">שני המנועים מחזירים ערכים זהים. המערכת החדשה יציבה ובטוחה לשימוש.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600 font-bold px-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>נמצאו פערים בין המנועים</span>
                  </div>
                  <div className="bg-white border hover:border-red-200 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                        <tr>
                          <th className="p-3">שורה</th>
                          <th className="p-3">תווית</th>
                          <th className="p-3 text-center">אקסל (V1)</th>
                          <th className="p-3 text-center">קוד (V2)</th>
                          <th className="p-3 text-center">פער</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.discrepancies.map((diff, i) => (
                          <tr key={diff.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="p-3 font-mono text-gray-500">{diff.rowIndex}</td>
                            <td className="p-3 font-medium text-gray-800">{diff.label}</td>
                            <td className="p-3 text-center text-gray-600">{diff.v1Value.toFixed(2)}</td>
                            <td className="p-3 text-center text-gray-600">{diff.v2Value.toFixed(2)}</td>
                            <td className={`p-3 text-center font-bold ${diff.status === 'ERROR' ? 'text-red-500' : 'text-orange-500'}`}>
                              {diff.diff.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-start">
                    <Button 
                      variant="outline" 
                      onClick={exportResults}
                      className="border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl shadow-sm"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      ייצוא דוח שגיאות ל-CSV
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
