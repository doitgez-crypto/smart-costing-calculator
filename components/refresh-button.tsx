"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = () => {
    setIsSpinning(true);
    router.refresh();
    setTimeout(() => setIsSpinning(false), 1000);
  };

  return (
    <button
      onClick={handleRefresh}
      className="fixed top-4 left-20 z-[100] p-3 rounded-full bg-white/60 backdrop-blur-md shadow-lg border border-white/40 hover:bg-white transition-all hover:-translate-y-1 hover:shadow-blue-500/20 pointer-events-auto group"
      title="רענן"
    >
      <RefreshCw
        className={`w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors ${isSpinning ? "animate-spin" : ""}`}
      />
    </button>
  );
}
