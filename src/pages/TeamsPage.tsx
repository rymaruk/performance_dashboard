import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";
import { useConfirmAction } from "../hooks/ConfirmContext";
import type { Team, TeamStatus, UserProfile } from "../types";

export function TeamsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirmAction();

  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [teamsRes, usersRes] = await Promise.all([
      supabase.from("teams").select("*").order("created_at", { ascending: true }),
      supabase.from("users").select("*, team:teams(*)").order("created_at", { ascending: true }),
    ]);
    setTeams((teamsRes.data as Team[]) ?? []);
    setAllUsers((usersRes.data as unknown as UserProfile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!isAdmin) { navigate("/", { replace: true }); return null; }

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setError(null);
    const { error: e } = await supabase.from("teams").insert({ name: newName.trim(), status: "active" });
    if (e) { setError(e.message); return; }
    setNewName("");
    load();
  };

  const toggleStatus = async (team: Team) => {
    const next: TeamStatus = team.status === "active" ? "suspended" : "active";
    await supabase.from("teams").update({ status: next }).eq("id", team.id);
    load();
  };

  const handleDelete = (team: Team) => {
    confirm(`Видалити команду «${team.name}»?`, async () => {
      setError(null);
      const { error: e } = await supabase.from("teams").delete().eq("id", team.id);
      if (e) {
        setError(e.message.includes("Cannot delete team")
          ? `Неможливо видалити «${team.name}»: до команди привʼязані цілі.`
          : e.message);
        return;
      }
      load();
    });
  };

  const addUserToTeam = async (userId: string, teamId: string) => {
    await supabase.from("users").update({ team_id: teamId }).eq("id", userId);
    load();
  };

  const removeUserFromTeam = async (userId: string) => {
    await supabase.from("users").update({ team_id: null }).eq("id", userId);
    load();
  };

  const teamMembers = (teamId: string) => allUsers.filter((u) => u.team_id === teamId);
  const availableUsers = (teamId: string) =>
    allUsers.filter((u) => u.team_id !== teamId && u.id !== "00000000-0000-0000-0000-000000000001");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-900 to-purple-900 text-white px-6 pt-4.5 pb-3.5 flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-lg font-bold">Управління командами</div>
          <div className="text-xs opacity-70">Створення, редагування, учасники команд</div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-white/15 border border-white/30 rounded-lg cursor-pointer hover:bg-white/25 transition-colors"
        >
          ← Назад
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Add team */}
        <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3">Додати нову команду</div>
          <div className="flex gap-2.5">
            <input
              className="flex-1 px-3.5 py-2 text-[13px] border border-gray-300 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow"
              placeholder="Назва команди"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button
              onClick={handleAdd}
              className="px-5 py-2 text-[13px] font-bold text-white bg-green-700 rounded-lg cursor-pointer whitespace-nowrap hover:bg-green-600 transition-colors"
            >
              + Додати
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-3.5 py-2.5 rounded-lg text-xs mb-4 border-l-[3px] border-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">Завантаження…</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">Команд ще немає</div>
        ) : (
          teams.map((t) => {
            const isOpen = expandedTeam === t.id;
            const members = teamMembers(t.id);
            const available = availableUsers(t.id);

            return (
              <div
                key={t.id}
                className={clsx(
                  "bg-white rounded-xl mb-3 shadow-sm overflow-hidden transition-opacity",
                  t.status === "suspended" && "opacity-70",
                )}
              >
                {/* Team header */}
                <div
                  className="flex items-center px-5 py-3.5 gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedTeam(isOpen ? null : t.id)}
                >
                  <span className={clsx("text-xs font-bold transition-transform", isOpen && "rotate-90")}>▶</span>

                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">
                      {t.name}
                      <span className="ml-2 text-[11px] text-gray-400 font-normal">
                        ({members.length} {members.length === 1 ? "учасник" : "учасників"})
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Створено: {new Date(t.created_at).toLocaleDateString("uk-UA")}
                    </div>
                  </div>

                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
                    t.status === "active" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700",
                  )}>
                    {t.status === "active" ? "Активна" : "Призупинена"}
                  </span>

                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStatus(t); }}
                    className={clsx(
                      "px-3 py-1 text-[11px] font-semibold rounded-md border cursor-pointer transition-colors",
                      t.status === "active"
                        ? "text-orange-700 bg-orange-50 border-orange-500 hover:bg-orange-100"
                        : "text-green-700 bg-green-50 border-green-500 hover:bg-green-100",
                    )}
                  >
                    {t.status === "active" ? "Призупинити" : "Активувати"}
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(t); }}
                    className="px-3 py-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-500 rounded-md cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    Видалити
                  </button>
                </div>

                {/* Expanded: members */}
                {isOpen && (
                  <div className="px-5 pb-4 border-t border-gray-200">
                    <div className="flex items-center gap-2.5 py-3">
                      <span className="text-xs font-semibold text-gray-600">Додати учасника:</span>
                      <select
                        onChange={(e) => { if (e.target.value) { addUserToTeam(e.target.value, t.id); e.target.value = ""; } }}
                        defaultValue=""
                        className="flex-1 max-w-[300px] px-3 py-1.5 text-xs border border-gray-300 rounded-lg cursor-pointer focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                      >
                        <option value="" disabled>— Обрати користувача —</option>
                        {available.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.email}){u.team_id ? " [вже в іншій команді]" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {members.length === 0 ? (
                      <div className="text-xs text-gray-400 py-2">Немає учасників</div>
                    ) : (
                      members.map((u, i) => (
                        <div
                          key={u.id}
                          className={clsx(
                            "flex items-center gap-2.5 py-2",
                            i < members.length - 1 && "border-b border-gray-100",
                          )}
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                            {(u.first_name || "?")[0]}{(u.last_name || "?")[0]}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-[13px] font-semibold text-gray-800">{u.first_name} {u.last_name}</div>
                            <div className="text-[10px] text-gray-400">{u.email}</div>
                          </div>
                          <span className={clsx(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-lg",
                            u.role === "admin" ? "bg-purple-50 text-purple-700" : "bg-primary-50 text-primary-700",
                          )}>
                            {u.role === "admin" ? "Адмін" : "Юзер"}
                          </span>
                          <button
                            onClick={() => removeUserFromTeam(u.id)}
                            className="px-2.5 py-0.5 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-500 rounded-md cursor-pointer hover:bg-red-100 transition-colors"
                          >
                            Прибрати
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
