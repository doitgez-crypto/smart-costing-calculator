import "./globals.css";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { ClientSecurity } from "@/components/client-security";
import { Calculator, History, BarChart3 } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "מחשבון עלויות חכם",
  description: "מחשבון עלויות מקצועי מבוסס Google Sheets"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="he" dir="rtl" suppressHydrationWarning={true}>
      <body className="min-h-screen bg-slate-50 relative selection:bg-blue-200">
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-purple-50 opacity-80" />
        <div className="min-h-screen flex flex-col relative z-0">
          <header className="border-b border-white/40 bg-white/70 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                  <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all">
                    <Calculator className="w-4 h-4" />
                    מחשבון
                  </Link>
                  <Link href="/history" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all">
                    <History className="w-4 h-4" />
                    היסטוריה
                  </Link>
                  <Link href="/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all">
                    <BarChart3 className="w-4 h-4" />
                    אסטרטגיה
                  </Link>
                </nav>
                {user && <LogoutButton />}
              </div>
            </div>
          </header>
          <main className="flex-1">
            <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
          </main>
          <ClientSecurity />
        </div>
      </body>
    </html>
  );
}

