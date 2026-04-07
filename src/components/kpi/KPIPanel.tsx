import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Editable } from "../ui";
import { ProgressBar } from "../ui/progress-bar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { FilterSelect } from "../ui/FilterSelect";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { goalPeriodOverlapsFilter, medDate } from "../../utils/date";
import { getAccentDef } from "../../constants";
import { BarChart3, FilterX, TrendingDown, TrendingUp, X } from "lucide-react";
import type { Goal, KPI, Project, Team } from "../../types";

interface KPIPanelProps {
  proj: Project;
  teams: Team[];
  onUpdateKPI: (gid: string, kid: string, fn: (k: KPI) => KPI) => void;
}

const kpiCardToneClass =
  "*:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card";

export function KPIPanel({ proj, teams, onUpdateKPI }: KPIPanelProps) {
  const [filterTeam, setFilterTeam] = useState<string | null>(null);
  const [filterPeriodFrom, setFilterPeriodFrom] = useState<string | null>(null);
  const [filterPeriodTo, setFilterPeriodTo] = useState<string | null>(null);

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
    return goalsWithKpis.filter((g: Goal) => {
      if (teamFilterId && g.team_id !== teamFilterId) return false;
      if (!goalPeriodOverlapsFilter(g.startDate, g.endDate, filterPeriodFrom, filterPeriodTo)) {
        return false;
      }
      return true;
    });
  }, [goalsWithKpis, teamFilterId, filterPeriodFrom, filterPeriodTo]);

  const hasAnyKpi = goalsWithKpis.length > 0;
  const severalGoals = filteredGoalsWithKpis.length > 1;
  const hasFilters = Boolean(filterTeam || filterPeriodFrom || filterPeriodTo);
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
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Label className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                Період цілі (перетин):
              </Label>
              <Input
                type="date"
                value={filterPeriodFrom ?? ""}
                onChange={(e) => setFilterPeriodFrom(e.target.value || null)}
                className={cn(
                  "h-7 w-[min(100%,9.5rem)] min-w-0 rounded-md text-[11px] font-medium sm:w-36",
                  filterPeriodFrom ? "border-border bg-accent text-foreground" : "border-input",
                )}
              />
              <span className="text-[11px] text-muted-foreground">—</span>
              <Input
                type="date"
                value={filterPeriodTo ?? ""}
                onChange={(e) => setFilterPeriodTo(e.target.value || null)}
                className={cn(
                  "h-7 w-[min(100%,9.5rem)] min-w-0 rounded-md text-[11px] font-medium sm:w-36",
                  filterPeriodTo ? "border-border bg-accent text-foreground" : "border-input",
                )}
              />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterTeam(null);
                  setFilterPeriodFrom(null);
                  setFilterPeriodTo(null);
                }}
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
                      <span className={cn("inline-block size-2.5 rounded-full", gac.bg)} />
                      {g.title}
                    </div>
                    <span className="flex flex-wrap items-center gap-2 text-[10px] font-normal text-muted-foreground">
                      <Badge variant="secondary" className={cn("text-[10px]", gac.text)}>
                        {teamName(g.team_id)}
                      </Badge>
                      <span className="tabular-nums">
                        ({medDate(g.startDate)}–{medDate(g.endDate)})
                      </span>
                    </span>
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

                      return (
                        <Card
                          key={k.id}
                          className="@container/card min-w-0 w-full border-border/80 shadow-sm"
                        >
                          <CardHeader className="gap-2">
                            <CardDescription>{k.name}</CardDescription>
                            <CardTitle
                              className={cn(
                                "min-w-0 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl",
                                pct >= 100 ? "text-success" : kac.text,
                              )}
                            >
                              <Editable
                                value={k.current}
                                onChange={(v) =>
                                  onUpdateKPI(g.id, k.id, (kk) => ({
                                    ...kk,
                                    current: Number(v),
                                  }))
                                }
                                type="number"
                                plain
                                numericOnly
                                className="block w-full min-w-0 text-inherit"
                              />
                            </CardTitle>
                            <CardAction>
                              <Badge
                                variant="outline"
                                className="rounded-full border-border px-2 py-0.5 text-xs font-medium"
                              >
                                <TrendIcon className="size-3" />
                                {pct}%
                              </Badge>
                            </CardAction>
                          </CardHeader>
                          <CardContent className="pb-2 pt-0">
                            <ProgressBar
                              current={k.current}
                              target={k.target}
                              colorClass={pct >= 100 ? "bg-success" : kac.bg}
                              h={8}
                            />
                          </CardContent>
                          <CardFooter className="flex flex-col items-start gap-1.5 text-sm">
                            <div className="line-clamp-1 flex items-center gap-2 font-medium">
                              {pct >= 100
                                ? "Ціль досягнуто"
                                : onTrack
                                  ? "Прогрес у нормі"
                                  : "Потрібне прискорення"}
                              <TrendIcon className="size-4 shrink-0" />
                            </div>
                            <div className="text-muted-foreground">
                              Ціль: {k.target} {k.unit}
                            </div>
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
