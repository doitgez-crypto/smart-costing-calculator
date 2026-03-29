"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Lock, Mail, Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError("אימייל או סיסמה שגויים. נסה שוב.")
        setLoading(false)
      } else {
        router.refresh()
        router.push("/")
      }
    } catch (e) {
      console.error("Login attempt failed:", e)
      setError("חיבור לשרת נכשל. בדוק את החיבור לאינטרנט.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">התחברות למערכת</CardTitle>
            <p className="text-sm text-slate-500 mt-2">הזן את פרטי ההתחברות שלך כדי להמשיך</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block" htmlFor="email">
                  אימייל
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-left placeholder:text-right"
                    placeholder="name@company.com"
                    dir="ltr"
                    disabled={loading}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block" htmlFor="password">
                  סיסמה
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 rounded-xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-left"
                    dir="ltr"
                    disabled={loading}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                    title={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 text-center">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all hover:shadow-lg disabled:opacity-70"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> מתחבר...
                  </span>
                ) : (
                  "התחבר"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
