"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, Settings as SettingsIcon, Clock, Eye, EyeOff, X, ListPlus, Users, UserPlus, Key, Trash2, ShieldCheck, Mail, User, Pencil } from "lucide-react";
import { getUserProfile, updateProfile, type FieldConfigState } from "@/app/actions";
import { fetchUsers, createAdminUser, updateUserPassword, deleteUser, updateAdminUser } from "@/app/actions/user-actions";
import { EXCEL_ROW_MAP } from "@/lib/excel-map";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab = "fields" | "users";

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("fields");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Field configurations
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfigState>({});
  
  // User management state
  const [userList, setUserList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", role: "user" });
  const [editingUser, setEditingUser] = useState<any>(null);

  const loadFieldConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getUserProfile();
      let configState: FieldConfigState = {};
      
      if (profile?.field_configs && Object.keys(profile.field_configs).length > 0) {
        configState = profile.field_configs;
      } else if (profile?.display_settings) {
        const ds = profile.display_settings;
        const inputs = new Set([...(ds.input_rows || []), ...(ds.monthly_rows || [])]);
        const outputs = new Set(ds.output_rows || []);
        Object.values(EXCEL_ROW_MAP).forEach(f => {
          if (inputs.has(f.rowIndex)) configState[f.id] = { isVisible: true, isInput: true };
          else if (outputs.has(f.rowIndex)) configState[f.id] = { isVisible: true, isInput: false };
          else configState[f.id] = { isVisible: false, isInput: true };
        });
      }
      setFieldConfigs(configState);
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת ההגדרות מ-Supabase.");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const users = await fetchUsers();
      setUserList(users);
    } catch (e: any) {
      setError(e.message || "שגיאה בטעינת משתמשים");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    const storedAuth = localStorage.getItem("admin_authed");
    if (storedAuth === "true") setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (activeTab === "fields") loadFieldConfigs();
    if (activeTab === "users") loadUsers();
  }, [authed, activeTab]);

  const login = () => {
    setError(null);
    if (password === "ADMIN") {
      setAuthed(true);
      localStorage.setItem("admin_authed", "true");
      return;
    }
    setError("סיסמה שגויה");
  };

  const handleCreateUser = async () => {
    setSaving(true);
    const res = await createAdminUser(newUser);
    if (res.success) {
      setSaveMessage("משתמש נוצר בהצלחה!");
      setShowCreateModal(false);
      setNewUser({ email: "", password: "", name: "", role: "user" });
      loadUsers();
    } else {
      setError(res.error || "שגיאה ביצירת משתמש");
    }
    setSaving(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    const res = await updateAdminUser(editingUser.id, {
      email: editingUser.email,
      name: editingUser.name,
      role: editingUser.role
    });
    if (res.success) {
      setSaveMessage("פרטי המשתמש עודכנו בהצלחה!");
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
    } else {
      setError(res.error || "שגיאה בעדכון המשתמש");
    }
    setSaving(false);
  };

  const handleResetPassword = async (userId: string) => {
    const newPass = window.prompt("הזן סיסמה חדשה עבור המשתמש:");
    if (!newPass) return;
    setSaving(true);
    const res = await updateUserPassword(userId, newPass);
    if (res.success) alert("הסיסמה עודכנה בהצלחה!");
    else alert("שגיאה בעדכון הסיסמה: " + res.error);
    setSaving(false);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${email}?`)) return;
    setSaving(true);
    const res = await deleteUser(userId);
    if (res.success) loadUsers();
    else alert("שגיאה במחיקת משתמש: " + res.error);
    setSaving(false);
  };

  const saveFields = async () => {
    setSaving(true);
    setError(null);
    try {
      const fullConfigPayload: FieldConfigState = { ...fieldConfigs };
      Object.keys(EXCEL_ROW_MAP).forEach(id => {
        if (!fullConfigPayload[id]) fullConfigPayload[id] = { isVisible: false, isInput: true };
      });
      await updateProfile(fullConfigPayload);
      setSaveMessage("ההגדרות נשמרו בהצלחה.");
      router.refresh();
    } catch (e: any) {
      setError(`שגיאה בשמירה: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto" dir="rtl">
        <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl rounded-2xl">
          <CardHeader><CardTitle>כניסת מנהל</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-right">
            <p className="text-sm text-gray-600">להזנת/עריכת ההגדרות נדרשת סיסמת מנהל.</p>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="הקלד סיסמה..." className="rounded-xl" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl" onClick={login}>כניסה</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20" dir="rtl">
      {/* Header & Tabs */}
      <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl rounded-2xl sticky top-4 z-50">
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button 
                onClick={() => setActiveTab("fields")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "fields" ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <SettingsIcon className="w-4 h-4" />
                מבנה מחשבון
              </button>
              <button 
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "users" ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Users className="w-4 h-4" />
                ניהול משתמשים
              </button>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "fields" && (
                <Button onClick={saveFields} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg">
                  {saving ? <Spinner className="w-4 h-4 mr-2" /> : "שמור מבנה"}
                </Button>
              )}
              {activeTab === "users" && (
                <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> משתמש חדש
                </Button>
              )}
              <Link href="/" className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
          {saveMessage && <p className="text-sm text-green-600 text-center font-medium mt-2">{saveMessage}</p>}
          {error && <p className="text-sm text-red-600 text-center font-medium mt-2">{error}</p>}
        </CardHeader>
      </Card>

      {/* Fields Management Tab */}
      {activeTab === "fields" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <Spinner className="mx-auto block my-10" /> : 
            Object.values(EXCEL_ROW_MAP).sort((a,b) => a.rowIndex - b.rowIndex).map((field) => {
              const state = fieldConfigs[field.id] || { isVisible: false, isInput: true };
              return (
                <Card key={field.id} className={`transition-all ${state.isVisible ? 'bg-white border-blue-100' : 'bg-gray-50/50 opacity-60 grayscale'}`}>
                  <CardContent className="p-4 flex flex-col h-full justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-md">שורה {field.rowIndex}</span>
                      <button onClick={() => setFieldConfigs(p=>({...p,[field.id]:{...state, isVisible: !state.isVisible}}))} className="p-1 rounded-full"><X className="w-4 h-4" /></button>
                    </div>
                    <h3 className="font-bold text-gray-800">{field.label}</h3>
                    {state.isVisible && (
                      <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={()=>setFieldConfigs(p=>({...p,[field.id]:{...state, isInput:true}}))} className={`flex-1 text-xs py-1.5 rounded-lg ${state.isInput ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>קלט</button>
                        <button onClick={()=>setFieldConfigs(p=>({...p,[field.id]:{...state, isInput:false}}))} className={`flex-1 text-xs py-1.5 rounded-lg ${!state.isInput ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>תוצאה</button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          }
        </div>
      )}

      {/* Users Management Tab */}
      {activeTab === "users" && (
        <Card className="shadow-2xl border-white/60 bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">שם / תפקיד</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">אימייל</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-600">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? <tr><td colSpan={3} className="py-20 text-center"><Spinner className="mx-auto" /></td></tr> : 
                  userList.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {u.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.role === 'admin' ? 'מנהל מערכת' : 'משתמש רגיל'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" /> {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingUser(u); setShowEditModal(true); }} className="text-blue-600 hover:bg-blue-100 rounded-lg">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleResetPassword(u.id)} className="text-slate-600 hover:bg-slate-100 rounded-lg">
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.id, u.email)} className="text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create User Modal (Simple) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white border-0 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2"><UserPlus className="w-6 h-6" /> משתמש חדש</CardTitle>
                <button onClick={() => setShowCreateModal(false)}><X className="w-6 h-6 hover:rotate-90 transition-transform" /></button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">שם מלא</label>
                <Input value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">אימייל</label>
                <Input type="email" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} className="rounded-xl h-11" dir="ltr" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">סיסמה</label>
                <Input type="password" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">תפקיד</label>
                <select 
                  value={newUser.role} 
                  onChange={e=>setNewUser({...newUser, role: e.target.value})} 
                  className="w-full h-11 rounded-xl border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="user">משתמש רגיל</option>
                  <option value="admin">מנהל מערכת</option>
                </select>
              </div>
              <Button onClick={handleCreateUser} disabled={saving} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg mt-4 transition-all">
                {saving ? "יוצר משתמש..." : "צור משתמש"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white border-0 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2"><Pencil className="w-6 h-6" /> עריכת משתמש</CardTitle>
                <button onClick={() => setShowEditModal(false)}><X className="w-6 h-6 hover:rotate-90 transition-transform" /></button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">שם מלא</label>
                <Input value={editingUser.name} onChange={e=>setEditingUser({...editingUser, name: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">אימייל</label>
                <Input type="email" value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email: e.target.value})} className="rounded-xl h-11" dir="ltr" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">תפקיד</label>
                <select 
                  value={editingUser.role} 
                  onChange={e=>setEditingUser({...editingUser, role: e.target.value})} 
                  className="w-full h-11 rounded-xl border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="user">משתמש רגיל</option>
                  <option value="admin">מנהל מערכת</option>
                </select>
              </div>
              <Button onClick={handleUpdateUser} disabled={saving} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg mt-4 transition-all">
                {saving ? "מעדכן..." : "שמור שינויים"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

