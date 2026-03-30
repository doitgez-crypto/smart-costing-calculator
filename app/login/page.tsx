"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("אימייל או סיסמה שגויים. נסה שוב.");
        setLoading(false);
      } else {
        router.refresh();
        router.push("/");
      }
    } catch (err: any) {
      setError("חיבור לשרת נכשל. בדוק את החיבור לאינטרנט.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border">
          <CardHeader className="text-center pb-2 pt-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Lock className="w-10 h-10" />
            </div>
            <CardTitle className="text-3xl font-black text-slate-800 tracking-tight">
              התחברות
            </CardTitle>
            <p className="text-slate-500 mt-2 font-medium">
              כניסה למחשבון העלויות החכם
            </p>
          </CardHeader>
          
          <CardContent className="p-8 pt-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 mr-1 text-right block">אימייל</label>
                <div className="relative group">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 rounded-2xl bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-left"
                    placeholder="your@email.com"
                    dir="ltr"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 mr-1 text-right block">סיסמה</label>
                <div className="relative group">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-14 rounded-2xl bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-left"
                    dir="ltr"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold text-center">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              >
                {loading ? <Spinner className="w-6 h-6" /> : "כניסה למערכת"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
