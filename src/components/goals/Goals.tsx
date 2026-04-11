import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { FilterSelect } from "../ui/FilterSelect";
import { Accordion } from "../ui/accordion";
import { GoalItem } from "./GoalItem";
import { PRIO, STAT } from "../../constants";
import { Badge } from "../ui/badge";
import { goalPeriodOverlapsFilter, today, addDays } from "../../utils/date";
import { DateRangePicker } from "../ui/DateRangePicker";
import { Label } from "../ui/label";
import { AlertTriangle, FilterX, Plus, X, Target } from "lucide-react";
import type { Goal, KPI, KpiDefinition, Task, Project, Team, UserProfile } from "../../types";

interface GoalsProps {
  proj: Project;
  kpiDefinitions: KpiDefinition[];
  teams: Team[];
  teamUsers: Record<string, UserProfile[]>;
  isAdmin: boolean;
  openGoalIds: string[];
  onOpenGoalIdsChange: (ids: string[]) => void;
  expandedTasks: Record<string, boolean>;
  onAddGoal: () => void;
  onRemoveGoal: (gid: string) => void;
  onUpdateGoalField: (gid: string, field: keyof Goal, value: unknown) => void;
  onChangeGoalDates: (gid: string, field: "startDate" | "endDate", val: string) => void;
  onAddKPI: (gid: string, kpiDefId: string) => void;
  onRemoveKPI: (gid: string, kid: string) => void;
  onUpdateKPI: (gid: string, kid: string, fn: (k: KPI) => KPI, comment?: string) => void;
  onAddTask: (gid: string) => void;
  onRemoveTask: (gid: string, tid: string) => void;
  onUpdateTask: (gid: string, tid: string, fn: (t: Task) => Task) => void;
  onToggleTask: (tid: string) => void;
  onAddLink: (gid: string, tid: string) => void;
  onRemoveLink: (gid: string, tid: string, lid: string) => void;
  onUpdateLink: (gid: string, tid: string, lid: string, lk: Task["links"][0]) => void;
  kpiHistoryRevision?: number;
}

export function Goals({
  proj,
  kpiDefinitions,
  teams,
  teamUsers,
  isAdmin,
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
  kpiHistoryRevision,
}: GoalsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterTeam = searchParams.get("team");
  const filterPrio = searchParams.get("prio");
  const filterStatus = searchParams.get("status");
  const filterUser = searchParams.get("user");
  const filterPeriodFrom = searchParams.get("from");
  const filterPeriodTo = searchParams.get("to");
  const filterOverdue = searchParams.get("overdue") === "1";

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );
  const setFilters = useCallback(
    (entries: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(entries)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );
  const setFilterTeam = (v: string | null) => setFilter("team", v);
  const setFilterPrio = (v: string | null) => setFilter("prio", v);
  const setFilterStatus = (v: string | null) => setFilter("status", v);
  const setFilterUser = (v: string | null) => setFilter("user", v);

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

  const now = useMemo(() => today(), []);

  const { filtered, filteredTaskIdsByGoal } = useMemo(() => {
    const filteredTaskIdsByGoal: Record<string, Set<string>> = {};
    const filtered = proj.goals.filter((g) => {
      if (teamFilterId && g.team_id !== teamFilterId) return false;
      if (filterPrio && g.priority !== filterPrio) return false;
      if (filterStatus && g.status !== filterStatus) return false;
      if (!goalPeriodOverlapsFilter(g.startDate, g.endDate, filterPeriodFrom, filterPeriodTo)) return false;

      if (filterOverdue) {
        const overdueTasks = g.tasks.filter((t) => t.status !== "Done" && t.endDate < now);
        if (overdueTasks.length === 0) return false;
        filteredTaskIdsByGoal[g.id] = new Set(overdueTasks.map((t) => t.id));
      }

      if (userFilterId) {
        const matchingTasks = g.tasks.filter((t) => t.user_id === userFilterId);
        if (matchingTasks.length === 0) return false;
        const existing = filteredTaskIdsByGoal[g.id];
        if (existing) {
          // Intersect with overdue filter
          const userSet = new Set(matchingTasks.map((t) => t.id));
          for (const id of existing) {
            if (!userSet.has(id)) existing.delete(id);
          }
          if (existing.size === 0) return false;
        } else {
          filteredTaskIdsByGoal[g.id] = new Set(matchingTasks.map((t) => t.id));
        }
      }

      return true;
    });
    return { filtered, filteredTaskIdsByGoal };
  }, [proj.goals, teamFilterId, filterPrio, filterStatus, userFilterId, filterPeriodFrom, filterPeriodTo, filterOverdue, now]);

  const hasFilters = filterTeam || filterPrio || filterStatus || filterUser || filterPeriodFrom || filterPeriodTo || filterOverdue;
  const noGoals = proj.goals.length === 0;
  const noMatches = filtered.length === 0;

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

      {!noGoals && (
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
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Label className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
              Період цілі:
            </Label>
            <DateRangePicker
              startDate={filterPeriodFrom ?? today()}
              endDate={filterPeriodTo ?? addDays(today(), 90)}
              onChangeRange={(from, to) => setFilters({ from, to })}
              size="sm"
              placeholder={!filterPeriodFrom && !filterPeriodTo ? "Обрати період" : undefined}
            />
          </div>
          {filterOverdue && (
            <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
              <AlertTriangle className="size-3" />
              Прострочені
              <button
                className="ml-0.5 hover:opacity-70"
                onClick={() => setFilter("overdue", null)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchParams({}, { replace: true })}
              className="text-destructive hover:text-destructive/80 h-7"
            >
              <X className="size-3" /> Скинути всі
            </Button>
          )}
        </div>
      )}

      {noGoals && (
        <div className="px-4 pt-4 pb-2">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Target />
              </EmptyMedia>
              <EmptyTitle>Ще немає цілей</EmptyTitle>
              <EmptyDescription>
                Створіть першу ціль, щоб додати KPI та задачі й відстежувати прогрес команди.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={onAddGoal} size="sm">
                <Plus className="size-3.5" /> Додати ціль
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {!noGoals && noMatches && hasFilters && (
        <div className="px-4 pt-4 pb-2">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FilterX />
              </EmptyMedia>
              <EmptyTitle>Немає цілей за фільтрами</EmptyTitle>
              <EmptyDescription>Спробуйте змінити або скинути фільтри, щоб побачити інші цілі.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterTeam(null);
                  setFilterPrio(null);
                  setFilterStatus(null);
                  setFilterUser(null);
                }}
              >
                <X className="size-3" /> Скинути фільтри
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {!noMatches && (
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
              isAdmin={isAdmin}
              teamUsers={g.team_id ? teamUsers[g.team_id] ?? [] : []}
              expandedTasks={expandedTasks}
              filteredTaskIds={filteredTaskIdsByGoal[g.id] ?? null}
              onRemove={() => onRemoveGoal(g.id)}
              onUpdateField={(field, value) => onUpdateGoalField(g.id, field, value)}
              onChangeDates={(field, val) => onChangeGoalDates(g.id, field, val)}
              onAddKPI={(kpiDefId) => onAddKPI(g.id, kpiDefId)}
              onRemoveKPI={(kid) => onRemoveKPI(g.id, kid)}
              onUpdateKPI={(kid, fn, comment) => onUpdateKPI(g.id, kid, fn, comment)}
              onAddTask={() => onAddTask(g.id)}
              onRemoveTask={(tid) => onRemoveTask(g.id, tid)}
              onUpdateTask={(tid, fn) => onUpdateTask(g.id, tid, fn)}
              onToggleTask={onToggleTask}
              onAddLink={(tid) => onAddLink(g.id, tid)}
              onRemoveLink={(tid, lid) => onRemoveLink(g.id, tid, lid)}
              onUpdateLink={(tid, lid, lk) => onUpdateLink(g.id, tid, lid, lk)}
              kpiHistoryRevision={kpiHistoryRevision}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}
