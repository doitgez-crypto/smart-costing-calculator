"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Calendar, Trash2, ArrowLeftRight } from "lucide-react";
import { deleteCalculation, bulkDeleteCalculations } from "@/lib/actions/calculations";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function HistoryClientView({ initialHistory }: { initialHistory: any[] }) {
  const [history, setHistory] = useState<any[]>(initialHistory);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק חישוב זה מההיסטוריה?")) return;
    setIsDeleting(true);
    const res = await deleteCalculation(id);
    if (res.success) {
      setHistory(prev => prev.filter(item => item.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
    setIsDeleting(false);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`האם למחוק ${selectedIds.length} חישובים מההיסטוריה?`)) return;
    setIsDeleting(true);
    const res = await bulkDeleteCalculations(selectedIds);
    if (res.success) {
      setHistory(prev => prev.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
    }
    setIsDeleting(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === history.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(history.map(item => item.id));
    }
  };

  const handleLoad = (id: string) => {
    router.push(`/?load=${id}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <History className="w-8 h-8 text-blue-600" />
          היסטוריית חישובים
        </h1>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-xl border border-white/60 shadow-sm">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                checked={selectedIds.length === history.length && history.length > 0}
                onChange={toggleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm font-medium text-slate-600 cursor-pointer select-none">בחר הכל</label>
            </div>
          )}
          
          {selectedIds.length > 0 && (
            <Button 
              onClick={handleBulkDelete}
              disabled={isDeleting}
              variant="outline"
              className="rounded-xl shadow-sm h-9 px-4 text-sm font-medium animate-in fade-in zoom-in duration-200 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק שנבחרו ({selectedIds.length})
            </Button>
          )}

          <div className="text-sm font-medium text-slate-500 bg-white/50 px-4 py-2 rounded-xl border border-white/60 shadow-sm">
            {history.length} חישובים שמורים
          </div>
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
              <Card className={`group bg-white transition-all rounded-2xl overflow-hidden border-2 ${selectedIds.includes(item.id) ? 'border-blue-500 shadow-md shadow-blue-500/10' : 'border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5'}`}>
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center p-6 gap-6">
                    {/* Checkbox Container */}
                    <div className="flex items-center justify-center shrink-0">
                      <input 
                        type="checkbox"
                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelection(item.id)}
                      />
                    </div>

                    <div className="space-y-1.5 flex-1 cursor-pointer" onClick={() => toggleSelection(item.id)}>
                      <h3 className="font-bold text-lg text-slate-800">{item.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
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

                    <div className="flex items-center gap-2 shrink-0">
                       <Button 
                         onClick={(e) => { e.stopPropagation(); handleLoad(item.id); }}
                         className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all rounded-xl border-none font-bold text-sm h-11 px-6 shadow-sm flex items-center gap-2"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          טען למחשבון
                        </Button>
                        <Button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          disabled={isDeleting}
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
