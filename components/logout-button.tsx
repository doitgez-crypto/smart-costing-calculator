"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "./ui/spinner";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
      title="התנתק"
    >
      {isPending ? <Spinner className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
      <span>התנתקות</span>
    </button>
  );
}
