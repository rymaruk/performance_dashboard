import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ProgressBar } from "../ui/progress-bar";
import { KpiEditDialog } from "./KpiEditDialog";
import { KpiHistoryDialog } from "./KpiHistoryDialog";
import { KpiLastChange } from "./KpiLastChange";
import { KpiDiffBadge } from "./KpiDiffBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { FilterSelect } from "../ui/FilterSelect";
import { DateRangePicker } from "../ui/DateRangePicker";
import { Label } from "../ui/label";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { goalPeriodOverlapsFilter, medDate, today, addDays } from "../../utils/date";
import { fmtNum } from "../../utils/format";
import { getAccentDef, PRIO } from "../../constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { BarChart3, CheckCircle2, ChevronDown, CircleDot, FilterX, TrendingDown, TrendingUp, X } from "lucide-react";
import { KPI_STAT } from "../../constants";
import type { Goal, KPI, KpiStatus, KpiValueHistory, Project, Team } from "../../types";

const KPI_STATUS_STYLES: Record<KpiStatus, string> = {
  "В процесі": "bg-sky-500/10 text-sky-600",
  "Завершено": "bg-success/10 text-success",
};

const PRIORITY_ORDER: Record<string, number> = {
  "🔴 Критичний": 1,
  "🟠 Високий": 2,
  "🟡 Середній": 3,
  "🟢 Низький": 4,
};

const PRIO_BADGE_STYLES: Record<string, string> = {
  "🔴 Критичний": "bg-rose-500/10 text-rose-600",
  "🟠 Високий": "bg-orange-500/10 text-orange-600",
  "🟡 Середній": "bg-amber-500/10 text-amber-600",
  "🟢 Низький": "bg-emerald-500/10 text-emerald-600",
};

interface KPIPanelProps {
  proj: Project;
  teams: Team[];
  onUpdateKPI: (gid: string, kid: string, fn: (k: KPI) => KPI, comment?: string) => void;
  onUpdateKPIStatus: (gid: string, kid: string, status: KpiStatus) => void;
  kpiLastChanges?: Record<string, KpiValueHistory>;
}

const kpiCardToneClass =
  "*:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card";

export function KPIPanel({ proj, teams, onUpdateKPI, onUpdateKPIStatus, kpiLastChanges }: KPIPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterTeam = searchParams.get("team");
  const filterPeriodFrom = searchParams.get("from");
  const filterPeriodTo = searchParams.get("to");
  const filterPriority = searchParams.get("prio");

  // null in URL → default "В процесі"; "all" in URL → show all (no status filter)
  const rawKpiStatus = searchParams.get("kpiStatus");
  const filterKpiStatusValue = rawKpiStatus ?? "В процесі"; // effective display/filter value
  const activeKpiStatusFilter = filterKpiStatusValue === "all" ? null : filterKpiStatusValue as KpiStatus;
  // Value passed to FilterSelect: "all" maps to null so it shows "Усі"
  const kpiStatusSelectValue = filterKpiStatusValue === "all" ? null : filterKpiStatusValue;

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
  const setFilterPriority = (v: string | null) => setFilter("prio", v);
  // When FilterSelect sends null (user chose "Усі"), store "all" so it's distinguishable from the "В процесі" default
  const setFilterKpiStatus = (v: string | null) => setFilter("kpiStatus", v ?? "all");

  const teamName = (teamId: string | null | undefined) =>
    teams.find((t) => t.id === teamId)?.name ?? "Без команди";

  const teamOptions = useMemo(() => teams.map((t) => `${t.name}::${t.id}`), [teams]);

  const teamFilterId = useMemo(() => {
    if (!filterTeam) return null;
    const sep = filterTeam.indexOf("::");
    return sep >= 0 ? filterTeam.slice(sep + 2) : null;
  }, [filterTeam]);

  const goalsWithKpis = useMemo(
    () => proj.goals.filter((g) => g.kpis.length > 0),
    [proj.goals],
  );

  const filteredGoalsWithKpis = useMemo(() => {
    return goalsWithKpis
      .filter((g: Goal) => {
        if (teamFilterId && g.team_id !== teamFilterId) return false;
        if (filterPriority && g.priority !== filterPriority) return false;
        if (!goalPeriodOverlapsFilter(g.startDate, g.endDate, filterPeriodFrom, filterPeriodTo)) {
          return false;
        }
        // Hide goals where no KPI matches the active status filter (null = Усі = no filter)
        if (activeKpiStatusFilter && !g.kpis.some((k) => k.status === activeKpiStatusFilter)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
      );
  }, [goalsWithKpis, teamFilterId, filterPriority, filterPeriodFrom, filterPeriodTo, activeKpiStatusFilter]);

  const hasAnyKpi = goalsWithKpis.length > 0;
  const severalGoals = filteredGoalsWithKpis.length > 1;
  // rawKpiStatus !== null means user explicitly changed the status filter (default is unset = "В процесі")
  const hasFilters = Boolean(
    filterTeam ||
    filterPriority ||
    filterPeriodFrom ||
    filterPeriodTo ||
    rawKpiStatus !== null,
  );
  const noMatches = hasAnyKpi && filteredGoalsWithKpis.length === 0 && hasFilters;

  return (
    <div className="w-full min-w-0 max-w-none">
      <div className="flex w-full min-w-0 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex w-full min-w-0 items-center gap-2 px-4 lg:px-6">
          <BarChart3 className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">KPI зведення</h2>
        </div>

        {hasAnyKpi && (
          <div className="flex flex-wrap items-center gap-2 px-4 lg:px-6">
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
            <FilterSelect
              label="Пріоритет цілі"
              value={filterPriority}
              options={[...PRIO]}
              onChange={setFilterPriority}
            />
            <FilterSelect
              label="Статус KPI"
              value={kpiStatusSelectValue}
              options={[...KPI_STAT]}
              onChange={setFilterKpiStatus}
            />
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Label className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                Період цілі (перетин):
              </Label>
              <DateRangePicker
                startDate={filterPeriodFrom ?? today()}
                endDate={filterPeriodTo ?? addDays(today(), 90)}
                onChangeRange={(from, to) => setFilters({ from, to })}
                size="sm"
                placeholder={!filterPeriodFrom && !filterPeriodTo ? "Обрати період" : undefined}
              />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchParams({}, { replace: true })}
                className="h-7 text-destructive hover:text-destructive/80"
              >
                <X className="size-3" /> Скинути всі
              </Button>
            )}
          </div>
        )}

        {!hasAnyKpi ? (
          <div className="w-full px-4 lg:px-6">
            <Empty className="border md:p-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BarChart3 />
                </EmptyMedia>
                <EmptyTitle>Немає KPI у зведенні</EmptyTitle>
                <EmptyDescription>
                  Додайте показники до цілей у блоці «Цілі та задачі», щоб бачити прогрес тут.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : noMatches ? (
          <div className="w-full px-4 lg:px-6">
            <Empty className="border md:p-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FilterX />
                </EmptyMedia>
                <EmptyTitle>Немає цілей за фільтром</EmptyTitle>
                <EmptyDescription>
                  Спробуйте змінити команду або вікно дат: показуються цілі, чий період (початок–кінець) перетинається з обраним інтервалом.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div
            className={cn(
              "grid w-full min-w-0 max-w-none gap-6 px-4 lg:px-6",
              severalGoals
                ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                : "grid-cols-1",
            )}
          >
            {filteredGoalsWithKpis.map((g) => {
              const gac = getAccentDef(g.color);
              const manyKpisInGoal = g.kpis.length > 1;
              const useWideKpiGrid = manyKpisInGoal || !severalGoals;

              return (
                <div
                  key={g.id}
                  className={cn(
                    "flex w-full min-w-0 flex-col gap-3",
                    severalGoals && manyKpisInGoal && "col-span-full",
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-foreground">
                      <span className={cn("inline-block size-2.5 rounded-full shrink-0", gac.bg)} />
                      {g.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 font-bold",
                          PRIO_BADGE_STYLES[g.priority] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {g.priority}
                      </span>
                      <span className="text-muted-foreground/40">|</span>
                      <Badge variant="secondary" className={cn("text-[10px]", gac.text)}>
                        {teamName(g.team_id)}
                      </Badge>
                      <span className="text-muted-foreground/40">|</span>
                      <span className="tabular-nums">
                        ({medDate(g.startDate)}–{medDate(g.endDate)})
                      </span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "grid w-full min-w-0 gap-4",
                      kpiCardToneClass,
                      useWideKpiGrid
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        : "grid-cols-1",
                    )}
                  >
                    {g.kpis.map((k) => {
                      const kac = getAccentDef(k.color ?? g.color);
                      const pct = k.target
                        ? Math.min(100, Math.round((k.current / k.target) * 100))
                        : 0;
                      const onTrack = pct >= 50;
                      const TrendIcon = onTrack ? TrendingUp : TrendingDown;

                      // When KPI status filter active, skip KPIs that don't match
                      if (activeKpiStatusFilter && k.status !== activeKpiStatusFilter) return null;

                      return (
                        <Card
                          key={k.id}
                          className="@container/card min-w-0 w-full border-border/80 shadow-sm"
                        >
                          <CardHeader className="gap-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <CardDescription className="truncate flex items-center gap-1">
                                  {k.status === "Завершено" && (
                                    <CheckCircle2 className="size-3 shrink-0 text-success" />
                                  )}
                                  {k.name}
                                </CardDescription>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className={cn(
                                        "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                        "cursor-pointer outline-none transition-colors hover:opacity-80",
                                        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                                        KPI_STATUS_STYLES[k.status ?? "В процесі"],
                                      )}
                                    >
                                      <CircleDot className="size-2.5" />
                                      {k.status ?? "В процесі"}
                                      <ChevronDown className="size-2.5 opacity-50" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-[140px]">
                                    <DropdownMenuGroup>
                                      {KPI_STAT.map((s) => (
                                        <DropdownMenuItem
                                          key={s}
                                          className={cn(k.status === s && "bg-accent font-semibold")}
                                          onSelect={() => onUpdateKPIStatus(g.id, k.id, s)}
                                        >
                                          <span
                                            className={cn(
                                              "size-2 rounded-full shrink-0",
                                              s === "Завершено" ? "bg-success" : "bg-sky-500",
                                            )}
                                          />
                                          {s}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className={cn("text-xs font-semibold", pct >= 100 ? "text-success" : kac.text)}>
                                Ціль: {fmtNum(k.target)} {k.unit}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 mb-0">
                            <CardTitle
                              className={cn(
                                "min-w-0 flex items-center gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl",
                                pct >= 100 ? "text-success" : kac.text,
                              )}
                            >
                              <span>{fmtNum(k.current)}</span>
                              {k.status !== "Завершено" && (
                                <KpiEditDialog
                                  kpi={k}
                                  onSave={(newVal, comment, newTarget) =>
                                    onUpdateKPI(
                                      g.id,
                                      k.id,
                                      (kk) => ({ ...kk, current: newVal, ...(newTarget !== undefined ? { target: newTarget } : {}) }),
                                      comment,
                                    )
                                  }
                                />
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <ProgressBar
                                  current={k.current}
                                  target={k.target}
                                  colorClass={pct >= 100 ? "bg-success" : kac.bg}
                                  h={8}
                                  hideLabel
                                />
                              </div>
                              <Badge
                                variant="outline"
                                className="shrink-0 rounded-full border-border px-2 py-0.5 text-xs font-medium"
                              >
                                <TrendIcon className="size-3" />
                                {pct}%
                              </Badge>
                            </div>
                            {k.status !== "Завершено" && (
                              <div className="flex items-center justify-between gap-2 w-full">
                                <KpiDiffBadge goalKpiId={k.id} optimistic={kpiLastChanges?.[k.id]} />
                                <div className="line-clamp-1 flex items-center gap-2 font-medium text-xs">
                                  {pct >= 100
                                    ? "Ціль досягнуто"
                                    : onTrack
                                      ? "Прогрес у нормі"
                                      : "Потрібне прискорення"}
                                  <TrendIcon className="size-4 shrink-0" />
                                </div>
                              </div>
                            )}
                          </CardContent>
                          <CardFooter className="flex flex-col items-start gap-2 text-sm">
                            <KpiLastChange goalKpiId={k.id} optimistic={kpiLastChanges?.[k.id]} />
                            <KpiHistoryDialog kpi={k} />
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
