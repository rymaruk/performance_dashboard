import { useState, useMemo } from "react";
import { Btn, FilterSelect } from "../ui";
import { GoalItem } from "./GoalItem";
import { ROLES, PRIO, STAT } from "../../constants";
import type { Goal, KPI, KpiDefinition, Task, Project } from "../../types";

interface GoalsProps {
  proj: Project;
  kpiDefinitions: KpiDefinition[];
  expandedGoals: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  onToggleGoal: (id: string) => void;
  isGoalOpen: (id: string) => boolean;
  onAddGoal: () => void;
  onRemoveGoal: (gid: string) => void;
  onUpdateGoalField: (gid: string, field: keyof Goal, value: unknown) => void;
  onChangeGoalDates: (gid: string, field: "startDate" | "endDate", val: string) => void;
  onAddKPI: (gid: string, kpiDefId: string) => void;
  onRemoveKPI: (gid: string, kid: string) => void;
  onUpdateKPI: (gid: string, kid: string, fn: (k: KPI) => KPI) => void;
  onAddTask: (gid: string) => void;
  onRemoveTask: (gid: string, tid: string) => void;
  onUpdateTask: (gid: string, tid: string, fn: (t: Task) => Task) => void;
  onToggleTask: (tid: string) => void;
  onAddLink: (gid: string, tid: string) => void;
  onRemoveLink: (gid: string, tid: string, lid: string) => void;
  onUpdateLink: (gid: string, tid: string, lid: string, lk: Task["links"][0]) => void;
}

export function Goals({
  proj,
  kpiDefinitions,
  expandedGoals: _expandedGoals,
  expandedTasks,
  onToggleGoal,
  isGoalOpen,
  onAddGoal,
  onRemoveGoal,
  onUpdateGoalField,
  onChangeGoalDates,
  onAddKPI,
  onRemoveKPI,
  onUpdateKPI,
  onAddTask,
  onRemoveTask,
  onUpdateTask,
  onToggleTask,
  onAddLink,
  onRemoveLink,
  onUpdateLink,
}: GoalsProps) {
  const [filterOwner, setFilterOwner] = useState<string | null>(null);
  const [filterPrio, setFilterPrio] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return proj.goals.filter((g) => {
      if (filterOwner && g.owner !== filterOwner) return false;
      if (filterPrio && g.priority !== filterPrio) return false;
      if (filterStatus && g.status !== filterStatus) return false;
      return true;
    });
  }, [proj.goals, filterOwner, filterPrio, filterStatus]);

  const hasFilters = filterOwner || filterPrio || filterStatus;

  return (
    <div>
      <div className="px-4 pt-4 flex justify-between items-center">
        <div className="text-[15px] font-bold">🎯 Цілі та задачі</div>
        <Btn onClick={onAddGoal} className="!bg-purple-700 hover:!bg-purple-600">＋ Ціль</Btn>
      </div>

      <div className="px-4 pt-2.5 flex gap-2 items-center flex-wrap">
        <span className="text-[11px] font-semibold text-gray-500">Фільтри:</span>
        <FilterSelect label="Команда" value={filterOwner} options={[...ROLES]} onChange={setFilterOwner} />
        <FilterSelect label="Пріоритет" value={filterPrio} options={[...PRIO]} onChange={setFilterPrio} />
        <FilterSelect label="Статус" value={filterStatus} options={[...STAT]} onChange={setFilterStatus} />
        {hasFilters && (
          <button
            onClick={() => { setFilterOwner(null); setFilterPrio(null); setFilterStatus(null); }}
            className="text-[11px] text-red-500 bg-transparent border-none cursor-pointer font-semibold px-2 py-1 hover:text-red-700"
          >
            Скинути всі
          </button>
        )}
      </div>

      {filtered.length === 0 && hasFilters && (
        <div className="py-8 px-4 text-center text-[13px] text-gray-400">
          Немає цілей за обраними фільтрами
        </div>
      )}

      {filtered.map((g) => (
        <GoalItem
          key={g.id}
          goal={g}
          kpiDefinitions={kpiDefinitions}
          isOpen={isGoalOpen(g.id)}
          expandedTasks={expandedTasks}
          onToggle={() => onToggleGoal(g.id)}
          onRemove={() => onRemoveGoal(g.id)}
          onUpdateField={(field, value) => onUpdateGoalField(g.id, field, value)}
          onChangeDates={(field, val) => onChangeGoalDates(g.id, field, val)}
          onAddKPI={(kpiDefId) => onAddKPI(g.id, kpiDefId)}
          onRemoveKPI={(kid) => onRemoveKPI(g.id, kid)}
          onUpdateKPI={(kid, fn) => onUpdateKPI(g.id, kid, fn)}
          onAddTask={() => onAddTask(g.id)}
          onRemoveTask={(tid) => onRemoveTask(g.id, tid)}
          onUpdateTask={(tid, fn) => onUpdateTask(g.id, tid, fn)}
          onToggleTask={onToggleTask}
          onAddLink={(tid) => onAddLink(g.id, tid)}
          onRemoveLink={(tid, lid) => onRemoveLink(g.id, tid, lid)}
          onUpdateLink={(tid, lid, lk) => onUpdateLink(g.id, tid, lid, lk)}
        />
      ))}
    </div>
  );
}
