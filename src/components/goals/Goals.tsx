import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { FilterSelect } from "../ui/FilterSelect";
import { Accordion } from "../ui/accordion";
import { GoalItem } from "./GoalItem";
import { ROLES, PRIO, STAT } from "../../constants";
import { Plus, X, Target } from "lucide-react";
import type { Goal, KPI, KpiDefinition, Task, Project } from "../../types";

interface GoalsProps {
  proj: Project;
  kpiDefinitions: KpiDefinition[];
  openGoalIds: string[];
  onOpenGoalIdsChange: (ids: string[]) => void;
  expandedTasks: Record<string, boolean>;
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
  openGoalIds,
  onOpenGoalIdsChange,
  expandedTasks,
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
        <div className="text-[15px] font-bold flex items-center gap-1.5">
          <Target className="size-4" /> Цілі та задачі
        </div>
        <Button onClick={onAddGoal} size="sm">
          <Plus className="size-3.5" /> Ціль
        </Button>
      </div>

      <div className="px-4 pt-2.5 flex gap-2 items-center flex-wrap">
        <span className="text-[11px] font-semibold text-muted-foreground">Фільтри:</span>
        <FilterSelect label="Команда" value={filterOwner} options={[...ROLES]} onChange={setFilterOwner} />
        <FilterSelect label="Пріоритет" value={filterPrio} options={[...PRIO]} onChange={setFilterPrio} />
        <FilterSelect label="Статус" value={filterStatus} options={[...STAT]} onChange={setFilterStatus} />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterOwner(null); setFilterPrio(null); setFilterStatus(null); }}
            className="text-destructive hover:text-destructive/80 h-7"
          >
            <X className="size-3" /> Скинути всі
          </Button>
        )}
      </div>

      {filtered.length === 0 && hasFilters && (
        <div className="py-8 px-4 text-center text-[13px] text-muted-foreground">
          Немає цілей за обраними фільтрами
        </div>
      )}

      <Accordion
        type="multiple"
        value={openGoalIds}
        onValueChange={onOpenGoalIdsChange}
        className="px-4 pt-2"
      >
        {filtered.map((g) => (
          <GoalItem
            key={g.id}
            goal={g}
            kpiDefinitions={kpiDefinitions}
            expandedTasks={expandedTasks}
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
      </Accordion>
    </div>
  );
}
