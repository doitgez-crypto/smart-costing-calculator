"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { History, Calendar, Trash2, ArrowLeftRight, ExternalLink } from "lucide-react";
import { getCalculations, deleteCalculation } from "@/lib/actions/calculations";
import { isDatabaseConfigured } from "@/app/actions";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Database, AlertTriangle } from "lucide-react";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDbLinked, setIsDbLinked] = useState(true);
  const router = useRouter();

  const loadHistory = async () => {
    setLoading(true);
    const dbStatus = await isDatabaseConfigured();
    setIsDbLinked(dbStatus);
    
    if (dbStatus) {
      const data = await getCalculations();
      setHistory(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק חישוב זה מההיסטוריה?")) return;
    const res = await deleteCalculation(id);
    if (res.success) {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleLoad = (id: string) => {
    router.push(`/?load=${id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-slate-500 font-medium">טוען היסטוריית חישובים...</p>
      </div>
    );
  }

  if (!isDbLinked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center text-amber-500 relative">
          <Database className="w-12 h-12" />
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
             <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-900 leading-tight">חיבור מסד הנתונים חסר</h2>
          <p className="text-slate-500 text-lg font-medium">כדי לראות ולשמור היסטוריית חישובים, עליך להגדיר את המערכת מול Supabase (או כל Database אחר ב-SQL).</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-right w-full">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">צעדים להפעלת ההיסטוריה:</p>
           <ul className="space-y-3 text-sm text-slate-600 font-medium">
             <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">1</span> הוסף <code className="bg-slate-200 px-1.5 py-0.5 rounded text-rose-600">DATABASE_URL</code> לקובץ ה-.env.local</li>
             <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">2</span> הרץ <code className="bg-slate-200 px-1.5 py-0.5 rounded">npx prisma migrate dev</code> בטרמינל</li>
           </ul>
        </div>

        <Button onClick={() => router.push('/')} className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 font-bold text-lg transition-all active:scale-95">
          חזרה למחשבון (Standalone)
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <History className="w-8 h-8 text-blue-600" />
          היסטוריית חישובים
        </h1>
        <div className="text-sm text-slate-500 bg-white/50 px-4 py-2 rounded-xl border border-white/60 shadow-sm">
          {history.length} חישובים שמורים
        </div>
      </div>

      {history.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
             <History className="w-16 h-16 opacity-20" />
             <p className="text-lg font-medium">עדיין לא שמרת חישובים</p>
             <Button onClick={() => router.push('/')} variant="outline" className="rounded-xl">
                בצע חישוב ראשון
             </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {history.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group bg-white hover:border-blue-200 transition-all hover:shadow-xl hover:shadow-blue-500/5 rounded-2xl overflow-hidden border-slate-100">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-6">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-lg text-slate-800">{item.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.createdAt).toLocaleDateString('he-IL', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                           ID: <span className="font-mono text-[10px]">{item.id.slice(0,8)}...</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <Button 
                         onClick={() => handleLoad(item.id)}
                         className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all rounded-xl border-none font-bold text-sm h-11 px-6 shadow-sm flex items-center gap-2"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          טען למחשבון
                        </Button>
                        <Button 
                          onClick={() => handleDelete(item.id)}
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl h-11 w-11 transition-colors"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
