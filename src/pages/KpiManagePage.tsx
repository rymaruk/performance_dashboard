import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";
import { useConfirmAction } from "../hooks/ConfirmContext";
import type { KpiDefinition } from "../types";

interface GoalUsage {
  goal_id: string;
  goal_title: string;
  project_name: string;
  current_value: number;
  target_value: number;
}

interface KpiWithUsage extends KpiDefinition {
  goals: GoalUsage[];
}

export function KpiManagePage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirmAction();

  const [kpis, setKpis] = useState<KpiWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("%");
  const [newTarget, setNewTarget] = useState("100");
  const [newDesc, setNewDesc] = useState("");

  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const load = useCallback(async () => {
    const [defsRes, junctionRes, goalsRes, projRes] = await Promise.all([
      supabase.from("kpi_definitions").select("*").order("name"),
      supabase.from("goal_kpis").select("*"),
      supabase.from("goals").select("id, title, project_id"),
      supabase.from("projects").select("id, name"),
    ]);

    const defs = (defsRes.data as KpiDefinition[]) ?? [];
    const junctions = junctionRes.data ?? [];
    const goals = goalsRes.data ?? [];
    const projects = projRes.data ?? [];

    const projectMap = new Map(projects.map((p: { id: string; name: string }) => [p.id, p.name]));
    const goalMap = new Map(
      goals.map((g: { id: string; title: string; project_id: string }) => [
        g.id,
        { title: g.title, project_name: projectMap.get(g.project_id) ?? "" },
      ]),
    );

    const usageByDef = new Map<string, GoalUsage[]>();
    for (const j of junctions) {
      const goalInfo = goalMap.get(j.goal_id);
      if (!goalInfo) continue;
      const arr = usageByDef.get(j.kpi_definition_id) ?? [];
      arr.push({
        goal_id: j.goal_id,
        goal_title: goalInfo.title,
        project_name: goalInfo.project_name,
        current_value: Number(j.current_value),
        target_value: Number(j.target_value),
      });
      usageByDef.set(j.kpi_definition_id, arr);
    }

    setKpis(
      defs.map((d) => ({
        ...d,
        goals: usageByDef.get(d.id) ?? [],
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) {
    navigate("/", { replace: true });
    return null;
  }

  const handleAdd = async () => {
    const trimName = newName.trim();
    if (!trimName) return;
    setError(null);
    const { error: e } = await supabase.from("kpi_definitions").insert({
      name: trimName,
      unit: newUnit.trim() || "%",
      target_value: Number(newTarget) || 100,
      description: newDesc.trim(),
    });
    if (e) {
      setError(e.message.includes("idx_kpi_definitions_name") ? "KPI з такою назвою вже існує" : e.message);
      return;
    }
    setNewName("");
    setNewUnit("%");
    setNewTarget("100");
    setNewDesc("");
    load();
  };

  const handleDelete = (kpi: KpiWithUsage) => {
    confirm(`Видалити KPI «${kpi.name}»?`, async () => {
      setError(null);
      const { error: e } = await supabase.from("kpi_definitions").delete().eq("id", kpi.id);
      if (e) {
        setError(
          e.message.includes("Cannot delete KPI")
            ? `Неможливо видалити «${kpi.name}»: KPI привʼязаний до цілей. Спочатку відʼєднайте його від усіх цілей.`
            : e.message,
        );
        return;
      }
      load();
    });
  };

  const startEdit = (kpi: KpiWithUsage) => {
    setEditingId(kpi.id);
    setEditName(kpi.name);
    setEditUnit(kpi.unit);
    setEditTarget(String(kpi.target_value));
    setEditDesc(kpi.description);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setError(null);
    const { error: e } = await supabase
      .from("kpi_definitions")
      .update({
        name: editName.trim(),
        unit: editUnit.trim() || "%",
        target_value: Number(editTarget) || 100,
        description: editDesc.trim(),
      })
      .eq("id", editingId);
    if (e) {
      setError(e.message.includes("idx_kpi_definitions_name") ? "KPI з такою назвою вже існує" : e.message);
      return;
    }
    setEditingId(null);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-primary-900 to-teal-900 text-white px-6 pt-4.5 pb-3.5 flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-lg font-bold">📈 Управління KPI показниками</div>
          <div className="text-xs opacity-70">Базовий список KPI, використання у цілях</div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-white/15 border border-white/30 rounded-lg cursor-pointer hover:bg-white/25 transition-colors"
        >
          ← Назад
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Create new KPI */}
        <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3">Створити новий KPI показник</div>
          <div className="grid grid-cols-[1fr_80px_80px] gap-2.5 mb-2.5">
            <input
              className="px-3.5 py-2 text-[13px] border border-gray-300 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow"
              placeholder="Назва KPI *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <input
              className="px-3 py-2 text-[13px] border border-gray-300 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow"
              placeholder="Одиниця"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
            />
            <input
              className="px-3 py-2 text-[13px] border border-gray-300 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow"
              placeholder="Ціль"
              type="number"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
            />
          </div>
          <div className="flex gap-2.5">
            <input
              className="flex-1 px-3.5 py-2 text-[13px] border border-gray-300 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow"
              placeholder="Опис (необовʼязково)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <button
              onClick={handleAdd}
              className="px-5 py-2 text-[13px] font-bold text-white bg-teal-700 rounded-lg cursor-pointer whitespace-nowrap hover:bg-teal-600 transition-colors"
            >
              + Створити
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
        ) : kpis.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">KPI показників ще немає</div>
        ) : (
          <div className="space-y-3">
            {kpis.map((kpi) => {
              const isOpen = expandedKpi === kpi.id;
              const isEditing = editingId === kpi.id;

              return (
                <div key={kpi.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* KPI header row */}
                  <div
                    className="flex items-center px-5 py-3.5 gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedKpi(isOpen ? null : kpi.id)}
                  >
                    <span className={clsx("text-xs font-bold transition-transform", isOpen && "rotate-90")}>▶</span>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex gap-2 items-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            className="px-2.5 py-1 text-[13px] border border-primary-400 rounded-md outline-none focus:ring-2 focus:ring-primary-100 w-48"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                          />
                          <input
                            className="px-2 py-1 text-[13px] border border-gray-300 rounded-md outline-none w-16"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                          />
                          <input
                            className="px-2 py-1 text-[13px] border border-gray-300 rounded-md outline-none w-20"
                            type="number"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                          />
                          <input
                            className="px-2 py-1 text-[13px] border border-gray-300 rounded-md outline-none flex-1 min-w-[120px]"
                            placeholder="Опис"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                          />
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 text-[11px] font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-500 transition-colors"
                          >
                            Зберегти
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 text-[11px] font-semibold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            Скасувати
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {kpi.name}
                            <span className="ml-2 text-[11px] text-gray-400 font-normal">
                              (ціль: {kpi.target_value} {kpi.unit})
                            </span>
                            <span className="ml-2 text-[11px] text-teal-600 font-normal">
                              — {kpi.goals.length} {kpi.goals.length === 1 ? "ціль" : "цілей"}
                            </span>
                          </div>
                          {kpi.description && (
                            <div className="text-[10px] text-gray-400 mt-0.5 truncate">{kpi.description}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => startEdit(kpi)}
                          className="px-3 py-1 text-[11px] font-semibold text-primary-700 bg-primary-50 border border-primary-500 rounded-md cursor-pointer hover:bg-primary-100 transition-colors"
                        >
                          Редагувати
                        </button>
                        <button
                          onClick={() => handleDelete(kpi)}
                          className={clsx(
                            "px-3 py-1 text-[11px] font-semibold rounded-md border cursor-pointer transition-colors",
                            kpi.goals.length > 0
                              ? "text-gray-400 bg-gray-50 border-gray-300 cursor-not-allowed"
                              : "text-red-700 bg-red-50 border-red-500 hover:bg-red-100",
                          )}
                          disabled={kpi.goals.length > 0}
                          title={kpi.goals.length > 0 ? "Спочатку відʼєднайте KPI від усіх цілей" : "Видалити KPI"}
                        >
                          Видалити
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Goals usage table */}
                  {isOpen && (
                    <div className="px-5 pb-4 border-t border-gray-200">
                      {kpi.goals.length === 0 ? (
                        <div className="text-xs text-gray-400 py-3">Цей KPI ще не привʼязаний до жодної цілі</div>
                      ) : (
                        <table className="w-full border-collapse text-xs mt-3">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">Ціль</th>
                              <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600">Проект</th>
                              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-600">Поточне</th>
                              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-600">Ціль</th>
                              <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-600">Прогрес</th>
                            </tr>
                          </thead>
                          <tbody>
                            {kpi.goals.map((g) => {
                              const pct = g.target_value ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
                              return (
                                <tr key={g.goal_id} className="border-b border-gray-100">
                                  <td className="px-3 py-2 font-medium text-gray-800">{g.goal_title}</td>
                                  <td className="px-3 py-2 text-gray-500">{g.project_name}</td>
                                  <td className={clsx("px-3 py-2 text-right font-bold", pct >= 100 ? "text-green-700" : "text-gray-900")}>
                                    {g.current_value}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-600">{g.target_value} {kpi.unit}</td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className={clsx("h-full rounded-full", pct >= 100 ? "bg-green-500" : "bg-primary-500")}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className={clsx("text-[11px] font-semibold", pct >= 100 ? "text-green-700" : "text-gray-600")}>
                                        {pct}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
