import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "מחשבון עלויות חכם",
  description: "מחשבון עלויות מקצועי מבוסס Google Sheets"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-background">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border bg-white">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  מחשבון עלויות חכם
                </h1>
                <p className="text-sm text-gray-500">
                  חישוב מבוסס Google Sheets
                </p>
              </div>
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

