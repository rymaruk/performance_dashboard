import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { FilterSelect } from "../ui/FilterSelect";
import { Accordion } from "../ui/accordion";
import { GoalItem } from "./GoalItem";
import { PRIO, STAT } from "../../constants";
import { Plus, X, Target } from "lucide-react";
import type { Goal, KPI, KpiDefinition, Task, Project, Team, UserProfile } from "../../types";

interface GoalsProps {
  proj: Project;
  kpiDefinitions: KpiDefinition[];
  teams: Team[];
  teamUsers: Record<string, UserProfile[]>;
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
  teams,
  teamUsers,
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
  const [filterTeam, setFilterTeam] = useState<string | null>(null);
  const [filterPrio, setFilterPrio] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string | null>(null);

  const teamOptions = useMemo(
    () => teams.map((t) => `${t.name}::${t.id}`),
    [teams],
  );

  const teamFilterId = useMemo(() => {
    if (!filterTeam) return null;
    const sep = filterTeam.indexOf("::");
    return sep >= 0 ? filterTeam.slice(sep + 2) : null;
  }, [filterTeam]);

  const allUsers = useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const users of Object.values(teamUsers)) {
      for (const u of users) {
        map.set(u.id, u);
      }
    }
    return [...map.values()];
  }, [teamUsers]);

  const userOptions = useMemo(
    () => allUsers.map((u) => `${u.first_name} ${u.last_name}::${u.id}`),
    [allUsers],
  );

  const userFilterId = useMemo(() => {
    if (!filterUser) return null;
    const sep = filterUser.indexOf("::");
    return sep >= 0 ? filterUser.slice(sep + 2) : null;
  }, [filterUser]);

  const { filtered, filteredTaskIdsByGoal } = useMemo(() => {
    const filteredTaskIdsByGoal: Record<string, Set<string>> = {};
    const filtered = proj.goals.filter((g) => {
      if (teamFilterId && g.team_id !== teamFilterId) return false;
      if (filterPrio && g.priority !== filterPrio) return false;
      if (filterStatus && g.status !== filterStatus) return false;

      if (userFilterId) {
        const matchingTasks = g.tasks.filter((t) => t.user_id === userFilterId);
        if (matchingTasks.length === 0) return false;
        filteredTaskIdsByGoal[g.id] = new Set(matchingTasks.map((t) => t.id));
      }

      return true;
    });
    return { filtered, filteredTaskIdsByGoal };
  }, [proj.goals, teamFilterId, filterPrio, filterStatus, userFilterId]);

  const hasFilters = filterTeam || filterPrio || filterStatus || filterUser;

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
        <FilterSelect
          label="Команда"
          value={filterTeam}
          options={teamOptions}
          onChange={setFilterTeam}
          renderOption={(opt) => {
            const sep = opt.indexOf("::");
            return sep >= 0 ? opt.slice(0, sep) : opt;
          }}
        />
        <FilterSelect label="Пріоритет" value={filterPrio} options={[...PRIO]} onChange={setFilterPrio} />
        <FilterSelect label="Статус" value={filterStatus} options={[...STAT]} onChange={setFilterStatus} />
        <FilterSelect
          label="Користувач"
          value={filterUser}
          options={userOptions}
          onChange={setFilterUser}
          renderOption={(opt) => {
            const sep = opt.indexOf("::");
            return sep >= 0 ? opt.slice(0, sep) : opt;
          }}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterTeam(null); setFilterPrio(null); setFilterStatus(null); setFilterUser(null); }}
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
            teams={teams}
            teamUsers={g.team_id ? teamUsers[g.team_id] ?? [] : []}
            expandedTasks={expandedTasks}
            filteredTaskIds={filteredTaskIdsByGoal[g.id] ?? null}
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
