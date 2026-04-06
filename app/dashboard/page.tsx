import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { getCalculationsFull } from "@/lib/actions/calculations";
import { isDatabaseConfigured } from "@/app/actions";
import { PieChart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardContent } from "./dashboard-content";

export const revalidate = 0;

export default async function DashboardPage() {
  const isDbLinked = await isDatabaseConfigured();

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
             <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">1</span> עדכון <code className="bg-slate-200 px-1.5 py-0.5 rounded text-rose-600">DATABASE_URL</code> בקובץ .env.local</li>
             <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">2</span> הרצת <code className="bg-slate-200 px-1.5 py-0.5 rounded">npx prisma migrate dev</code></li>
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

  return (
    <Suspense 
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Spinner />
          <p className="text-slate-500 font-medium">מעבד ניתוח אסטרטגי...</p>
        </div>
      }
    >
      <DashboardDataLoader />
    </Suspense>
  );
}

// Ensure the data fetching is in a child component so the Suspense boundary catches it
async function DashboardDataLoader() {
  const history = await getCalculationsFull();
  return <DashboardContent historyItems={history} />;
}
