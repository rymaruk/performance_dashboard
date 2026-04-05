import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";
import { useConfirmAction } from "../hooks/ConfirmContext";
import type { UserProfile, Team } from "../types";

interface ProjectRow { id: string; name: string; }

export function UsersPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirmAction();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [_projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fLogin, setFLogin] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fRole, setFRole] = useState<"admin" | "user">("user");
  const [fTeamId, setFTeamId] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [usersRes, teamsRes, projRes] = await Promise.all([
      supabase.from("users").select("*, team:teams(*)").order("created_at", { ascending: true }),
      supabase.from("teams").select("*").order("created_at", { ascending: true }),
      supabase.from("projects").select("id, name").order("created_at", { ascending: true }),
    ]);
    setUsers((usersRes.data as unknown as UserProfile[]) ?? []);
    setTeams((teamsRes.data as Team[]) ?? []);
    setProjects((projRes.data as ProjectRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!isAdmin) { navigate("/", { replace: true }); return null; }

  const resetForm = () => {
    setFFirstName(""); setFLastName(""); setFEmail(""); setFLogin(""); setFPassword("");
    setFRole("user"); setFTeamId(""); setShowForm(false);
  };

  const handleCreate = async () => {
    if (!fEmail.trim() || !fPassword.trim() || !fFirstName.trim() || !fLastName.trim() || !fLogin.trim()) {
      setError("Заповніть усі обовʼязкові поля"); return;
    }
    setError(null); setCreating(true);
    const { error: signupErr } = await supabase.auth.signUp({
      email: fEmail.trim(), password: fPassword,
      options: { data: { first_name: fFirstName.trim(), last_name: fLastName.trim(), login: fLogin.trim(), role: fRole, team_id: fTeamId || null } },
    });
    if (signupErr) { setError(signupErr.message); setCreating(false); return; }
    resetForm(); setCreating(false); setTimeout(load, 1000);
  };

  const handleDelete = (u: UserProfile) => {
    if (u.id === "00000000-0000-0000-0000-000000000001") { setError("Системний адміністратор не може бути видалений"); return; }
    confirm(`Видалити користувача «${u.first_name} ${u.last_name}» (${u.email})?`, async () => {
      setError(null);
      const { error: e } = await supabase.from("users").delete().eq("id", u.id);
      if (e) { setError(e.message); return; }
      load();
    });
  };

  const handleRoleChange = async (u: UserProfile, newRole: "admin" | "user") => {
    if (u.id === "00000000-0000-0000-0000-000000000001") return;
    await supabase.from("users").update({ role: newRole }).eq("id", u.id);
    load();
  };

  const handleTeamChange = async (u: UserProfile, newTeamId: string) => {
    await supabase.from("users").update({ team_id: newTeamId || null }).eq("id", u.id);
    load();
  };

  const isSeedAdmin = (id: string) => id === "00000000-0000-0000-0000-000000000001";

  const inputCls = "w-full px-3.5 py-2 text-[13px] border border-gray-300 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow";
  const selectCls = clsx(inputCls, "cursor-pointer");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-900 to-purple-900 text-white px-6 pt-4.5 pb-3.5 flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-lg font-bold">Користувачі</div>
          <div className="text-xs opacity-70">Управління обліковими записами</div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-white/15 border border-white/30 rounded-lg cursor-pointer hover:bg-white/25 transition-colors"
        >
          ← Дашборд
        </button>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-6">
        <div className="flex justify-end mb-5">
          <button
            onClick={() => setShowForm((v) => !v)}
            className={clsx(
              "px-5 py-2 text-[13px] font-bold text-white rounded-lg cursor-pointer transition-colors",
              showForm ? "bg-gray-500 hover:bg-gray-400" : "bg-green-700 hover:bg-green-600",
            )}
          >
            {showForm ? "Скасувати" : "+ Новий користувач"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Створити користувача</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Імʼя *</label>
                <input className={inputCls} value={fFirstName} onChange={(e) => setFFirstName(e.target.value)} placeholder="Андрій" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Прізвище *</label>
                <input className={inputCls} value={fLastName} onChange={(e) => setFLastName(e.target.value)} placeholder="Іваненко" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Email *</label>
                <input type="email" className={inputCls} value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Логін *</label>
                <input className={inputCls} value={fLogin} onChange={(e) => setFLogin(e.target.value)} placeholder="andrii_iv" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Пароль *</label>
                <input type="password" className={inputCls} value={fPassword} onChange={(e) => setFPassword(e.target.value)} placeholder="мін. 6 символів" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Роль</label>
                <select className={selectCls} value={fRole} onChange={(e) => setFRole(e.target.value as "admin" | "user")}>
                  <option value="user">Користувач</option>
                  <option value="admin">Адміністратор</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Команда</label>
                <select className={selectCls} value={fTeamId} onChange={(e) => setFTeamId(e.target.value)}>
                  <option value="">— Без команди —</option>
                  {teams.filter((t) => t.status === "active").map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className={clsx(
                "px-7 py-2.5 text-[13px] font-bold text-white rounded-lg cursor-pointer transition-colors",
                creating ? "bg-gray-400 cursor-not-allowed" : "bg-primary-700 hover:bg-primary-600",
              )}
            >
              {creating ? "Створення…" : "Створити"}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 px-3.5 py-2.5 rounded-lg text-xs mb-4 border-l-[3px] border-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">Завантаження…</div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">Користувачів ще немає</div>
        ) : (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_120px_160px_80px] gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
              <span>Користувач</span>
              <span>Email / Логін</span>
              <span>Роль</span>
              <span>Команда</span>
              <span></span>
            </div>

            {users.map((u, i) => (
              <div
                key={u.id}
                className={clsx(
                  "grid grid-cols-[1fr_1fr_120px_160px_80px] gap-2 px-5 py-3 items-center",
                  i < users.length - 1 && "border-b border-gray-200",
                  isSeedAdmin(u.id) && "bg-purple-50",
                )}
              >
                <div>
                  <div className="text-[13px] font-semibold text-gray-900">
                    {u.first_name} {u.last_name}
                    {isSeedAdmin(u.id) && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-px rounded-lg bg-purple-100 text-purple-700 font-bold">SYSTEM</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-px">
                    {new Date(u.created_at).toLocaleDateString("uk-UA")}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-800">{u.email}</div>
                  <div className="text-[10px] text-gray-400">@{u.login}</div>
                </div>

                <div>
                  {isSeedAdmin(u.id) ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700">Адмін</span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value as "admin" | "user")}
                      className={clsx(
                        "px-2 py-0.5 text-[11px] font-semibold border border-gray-300 rounded-lg cursor-pointer",
                        u.role === "admin" ? "bg-purple-50 text-purple-700" : "bg-primary-50 text-primary-700",
                      )}
                    >
                      <option value="user">Користувач</option>
                      <option value="admin">Адмін</option>
                    </select>
                  )}
                </div>

                <div>
                  {isSeedAdmin(u.id) ? (
                    <span className="text-[11px] text-gray-400">—</span>
                  ) : (
                    <select
                      value={u.team_id ?? ""}
                      onChange={(e) => handleTeamChange(u, e.target.value)}
                      className="px-2 py-0.5 text-[11px] border border-gray-300 rounded-lg cursor-pointer max-w-[150px]"
                    >
                      <option value="">— Немає —</option>
                      {teams.filter((t) => t.status === "active").map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-right">
                  {!isSeedAdmin(u.id) && (
                    <button
                      onClick={() => handleDelete(u)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-500 rounded-md cursor-pointer hover:bg-red-100 transition-colors"
                    >
                      Видалити
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
