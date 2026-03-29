import "./globals.css";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

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
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  מחשבון עלויות חכם
                </h1>
              </div>
              {user && <LogoutButton />}
            </div>
          </header>
          <main className="flex-1">
            <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

