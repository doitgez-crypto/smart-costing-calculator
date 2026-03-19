"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Clock, User, ClipboardList, CheckCircle2 } from "lucide-react";
import type { HistoryLogEntry } from "@/lib/google-sheets";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function HistoryClientView({ logs }: { logs: HistoryLogEntry[] }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", bounce: 0.2 } }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-600" />
          היסטוריית חישובים
        </h2>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-4 py-2 text-sm text-gray-700 hover:bg-white transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה למחשבון</span>
        </Link>
      </div>

      {logs.length === 0 ? (
        <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border-white/60 py-12 text-center text-gray-500">
          לא נמצאו רשומות בהיסטוריה.
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
        >
          {logs.map((log, i) => (
            <motion.div key={i} variants={itemVariants} className="h-full">
              <Card className="h-full flex flex-col bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border-white/60 hover:shadow-2xl hover:shadow-blue-900/10 transition-shadow duration-300">
                <CardHeader className="border-b border-gray-100/50 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span dir="ltr">{log.timestamp ? new Date(log.timestamp).toLocaleString("he-IL") : "לא ידוע"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      <User className="w-3.5 h-3.5" />
                      {log.userName}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <ClipboardList className="w-3.5 h-3.5" />
                      נתוני קלט
                    </h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {log.inputs}
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      תוצאות (Log)
                    </h4>
                    <div className="text-sm font-mono tracking-wide text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                      {log.results}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
