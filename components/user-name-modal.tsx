"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  onConfirm: (name: string) => void;
};

const STORAGE_KEY = "smart-costing-user-name";

export function UserNameModal({ onConfirm }: Props) {
  const storageKey = useMemo(() => STORAGE_KEY, []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(storageKey)
        : null;

    if (saved) {
      onConfirm(saved);
      setOpen(false);
    } else {
      setOpen(true);
    }

    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, onConfirm]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    window.localStorage.setItem(storageKey, trimmed);
    onConfirm(trimmed);
    setOpen(false);
  };

  if (!open && initialized) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>שלום וברוך הבא</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 text-right">
            לפני שמתחילים, נא להזין שם משתמש. השם נשמר במחשב בלבד.
          </p>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-800 block text-right">
              שם משתמש
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="הקלד/י את שמך"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>שמירה והמשך</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

