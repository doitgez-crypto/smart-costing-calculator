import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { getCalculations } from "@/lib/actions/calculations";
import { isDatabaseConfigured } from "@/app/actions";
import { Database, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HistoryClientView } from "./history-client";

export const revalidate = 0;

export default async function HistoryPage() {
  const isDbLinked = await isDatabaseConfigured();

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

        <Link href="/">
          <Button className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 font-bold text-lg transition-all active:scale-95">
            חזרה למחשבון (Standalone)
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Suspense 
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Spinner />
          <p className="text-slate-500 font-medium">טוען היסטוריית חישובים...</p>
        </div>
      }
    >
      <HistoryDataLoader />
    </Suspense>
  );
}

// Separate component for data loading to boundary the Suspense gracefully
async function HistoryDataLoader() {
  const history = await getCalculations();
  return <HistoryClientView initialHistory={history || []} />;
}
