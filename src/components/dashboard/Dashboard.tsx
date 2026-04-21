import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Label,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { ProgressBar } from "../ui/progress-bar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import type { ChartConfig } from "../ui/chart";
import { ColorPicker } from "../ui/color-picker";
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemMedia,
  ItemActions,
} from "../ui/item";
import { ACCENT_COLORS, getAccentDef } from "../../constants";
import type { AccentColor } from "../../constants";
import { medDate, diffDays, today } from "../../utils/date";
import type { Project, ProjectStats, Team } from "../../types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../../hooks/AuthContext";
import { AlertTriangle, BarChart3, TrendingUp } from "lucide-react";

type OverviewAccents = {
  goals: AccentColor;
  tasks: AccentColor;
  kpi: AccentColor;
};

const DEFAULT_OVERVIEW_ACCENTS: OverviewAccents = {
  goals: "sky",
  tasks: "orange",
  kpi: "violet",
};

const ACCENT_KEYS = new Set(ACCENT_COLORS.map((c) => c.key));

function parseOverviewAccentsFromDb(raw: unknown): OverviewAccents {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_OVERVIEW_ACCENTS };
  const p = raw as Record<string, unknown>;
  const next = { ...DEFAULT_OVERVIEW_ACCENTS };
  (["goals", "tasks", "kpi"] as const).forEach((k) => {
    const v = p[k];
    if (typeof v === "string" && ACCENT_KEYS.has(v as AccentColor)) {
      next[k] = v as AccentColor;
    }
  });
  return next;
}

function svgPoint(viewBox: { cx?: unknown; cy?: unknown }): { cx: number; cy: number } | null {
  const cx = Number(viewBox.cx);
  const cy = Number(viewBox.cy);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return { cx, cy };
}

interface DashboardProps {
  proj: Project;
  stats: ProjectStats;
  teams: Team[];
}


export function Dashboard({ proj, stats, teams }: DashboardProps) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { profile, refreshProfile } = useAuth();
  const goalsPath = projectId ? `/${projectId}/goals` : "/goals";
  const openGoal = useCallback((goalId: string) => {
    navigate(`${goalsPath}?id=${encodeURIComponent(goalId)}`);
  }, [goalsPath, navigate]);
  const teamName = (teamId: string | null | undefined) =>
    teams.find((t) => t.id === teamId)?.name ?? "Без команди";

  const [overviewAccents, setOverviewAccents] = useState<OverviewAccents>(DEFAULT_OVERVIEW_ACCENTS);

  useEffect(() => {
    if (!profile) return;
    setOverviewAccents(parseOverviewAccentsFromDb(profile.dashboard_overview_accents));
  }, [profile?.id]);

  const updateOverviewAccent = useCallback(
    (key: keyof OverviewAccents, c: AccentColor) => {
      setOverviewAccents((prev) => {
        const next = { ...prev, [key]: c };
        if (profile?.id) {
          void (async () => {
            const { error } = await supabase
              .from("users")
              .update({ dashboard_overview_accents: next })
              .eq("id", profile.id);
            if (error) {
              console.error(error);
              return;
            }
            await refreshProfile();
          })();
        }
        return next;
      });
    },
    [profile?.id, refreshProfile],
  );

  const progressByTeam = useMemo(() => {
    type GoalTaskProgress = {
      id: string;
      title: string;
      status: string;
      endDate: string;
      pct: number;
    };

    type GoalKpiProgress = {
      id: string;
      name: string;
      current: number;
      target: number;
      unit: string;
      pct: number;
      done: boolean;
    };

    type GoalProgress = {
      id: string;
      title: string;
      startDate: string;
      endDate: string;
      teamLabel: string;
      color: string | null;
      doneTasks: number;
      totalTasks: number;
      doneKPIs: number;
      totalKPIs: number;
      tasksPct: number;
      kpiPct: number;
      totalDone: number;
      totalItems: number;
      pct: number;
      tasks: GoalTaskProgress[];
      kpis: GoalKpiProgress[];
    };

    type TeamProgress = {
      teamLabel: string;
      goalCount: number;
      goals: GoalProgress[];
      totalDoneTasks: number;
      totalTasks: number;
      totalDoneKPIs: number;
      totalKPIs: number;
      doneItems: number;
      totalItems: number;
      pct: number;
      color: string | null;
    };

    const map: Record<string, TeamProgress> = {};

    proj.goals.forEach((g) => {
      const teamLabel = teamName(g.team_id);
      if (!map[teamLabel]) {
        map[teamLabel] = {
          teamLabel,
          goalCount: 0,
          goals: [],
          totalDoneTasks: 0,
          totalTasks: 0,
          totalDoneKPIs: 0,
          totalKPIs: 0,
          doneItems: 0,
          totalItems: 0,
          pct: 0,
          color: g.color,
        };
      }

      const doneTasks = g.tasks.filter((t) => t.status === "Done").length;
      const totalTasks = g.tasks.length;
      const doneKPIs = g.kpis.filter((k) => k.target > 0 && k.current >= k.target).length;
      const totalKPIs = g.kpis.length;
      const totalDone = doneTasks + doneKPIs;
      const totalItems = totalTasks + totalKPIs;
      const tasks: GoalTaskProgress[] = g.tasks.map((t) => ({
        id: t.id,
        title: t.title || "—",
        status: t.status,
        endDate: t.endDate,
        pct: t.status === "Done" ? 100 : t.status === "In Progress" ? 50 : 0,
      }));
      const kpis: GoalKpiProgress[] = g.kpis.map((k) => {
        const rawPct = k.target > 0 ? Math.round((k.current / k.target) * 100) : 0;
        return {
          id: k.id,
          name: k.name || "—",
          current: k.current,
          target: k.target,
          unit: k.unit,
          pct: Math.min(Math.max(rawPct, 0), 100),
          done: k.target > 0 && k.current >= k.target,
        };
      });

      const goalProgress: GoalProgress = {
        id: g.id,
        title: g.title || "—",
        startDate: g.startDate,
        endDate: g.endDate,
        teamLabel,
        color: g.color,
        doneTasks,
        totalTasks,
        doneKPIs,
        totalKPIs,
        tasksPct: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        kpiPct: totalKPIs > 0 ? Math.round((doneKPIs / totalKPIs) * 100) : 0,
        totalDone,
        totalItems,
        pct: totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0,
        tasks,
        kpis,
      };

      const team = map[teamLabel];
      team.goalCount++;
      team.goals.push(goalProgress);
      team.totalDoneTasks += doneTasks;
      team.totalTasks += totalTasks;
      team.totalDoneKPIs += doneKPIs;
      team.totalKPIs += totalKPIs;
      team.doneItems += totalDone;
      team.totalItems += totalItems;
    });

    return Object.values(map)
      .map((team) => ({
        ...team,
        goals: team.goals.sort((a, b) => b.pct - a.pct),
        pct: team.totalItems > 0 ? Math.round((team.doneItems / team.totalItems) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [proj, teams]);

  const markers = useMemo(() => {
    const now = today();
    let overdueTasks = 0, blockedGoals = 0, upcomingDeadlines = 0;
    const overdueByTeam: Record<string, { title: string; endDate: string; goal: string; color: string | null }[]> = {};
    const upcomingByTeam: Record<string, { title: string; endDate: string; color: string | null }[]> = {};
    proj.goals.forEach((g) => {
      if (g.status === "Заблоковано") blockedGoals++;
      const daysLeft = diffDays(now, g.endDate);
      if (daysLeft >= 0 && daysLeft <= 14 && g.status !== "Завершено") {
        upcomingDeadlines++;
        const team = teamName(g.team_id);
        if (!upcomingByTeam[team]) upcomingByTeam[team] = [];
        upcomingByTeam[team].push({ title: g.title, endDate: g.endDate, color: g.color });
      }
      g.tasks.forEach((t) => {
        if (t.status !== "Done" && t.endDate < now) {
          overdueTasks++;
          const team = teamName(g.team_id);
          if (!overdueByTeam[team]) overdueByTeam[team] = [];
          overdueByTeam[team].push({ title: t.title, endDate: t.endDate, goal: g.title, color: t.color ?? g.color });
        }
      });
    });
    return { overdueTasks, blockedGoals, upcomingDeadlines, overdueByTeam, upcomingByTeam };
  }, [proj]);

  const goalsPct = stats.totalGoals > 0 ? Math.round((stats.goalsDone / stats.totalGoals) * 100) : 0;
  const tasksPct = Number.isFinite(stats.taskPct) ? stats.taskPct : 0;
  const kpiPct = Number.isFinite(stats.kpiPct) ? stats.kpiPct : 0;
  const avgPct = Math.round((goalsPct + tasksPct + kpiPct) / 3);
  const avgPctLabel = Number.isFinite(avgPct) ? avgPct : 0;

  const overviewData = useMemo(
    () => [
      { name: "KPI", value: kpiPct, fill: getAccentDef(overviewAccents.kpi).hex },
      { name: "Задачі", value: tasksPct, fill: getAccentDef(overviewAccents.tasks).hex },
      { name: "Цілі", value: goalsPct, fill: getAccentDef(overviewAccents.goals).hex },
    ],
    [goalsPct, tasksPct, kpiPct, overviewAccents],
  );

  const overviewConfig: ChartConfig = useMemo(
    () => ({
      Цілі: { label: "Цілі", color: getAccentDef(overviewAccents.goals).hex },
      Задачі: { label: "Задачі", color: getAccentDef(overviewAccents.tasks).hex },
      KPI: { label: "KPI", color: getAccentDef(overviewAccents.kpi).hex },
    }),
    [overviewAccents],
  );

  return (
    <div>
      {/* Unified alerts widget */}
      {(markers.overdueTasks > 0 || markers.blockedGoals > 0 || markers.upcomingDeadlines > 0) && (
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <AlertTriangle className="size-4" /> Контроль дедлайнів
            </CardTitle>
            <CardDescription>Огляд, прострочені задачі по командах та цілі з дедлайном до 14 днів</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="summary">Огляд</TabsTrigger>
                <TabsTrigger value="overdue-teams">Прострочені по командах</TabsTrigger>
                <TabsTrigger value="upcoming">Дедлайни ≤ 14 днів</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Item
                    variant="outline"
                    className="border-l-4 border-destructive bg-destructive/10 cursor-pointer hover:bg-destructive/15 transition-colors"
                    onClick={() => navigate(`${goalsPath}?overdue=1`)}
                  >
                    <ItemContent>
                      <ItemTitle className="text-lg font-extrabold text-destructive">{markers.overdueTasks}</ItemTitle>
                      <ItemDescription className="text-destructive font-semibold">Прострочені задачі</ItemDescription>
                    </ItemContent>
                  </Item>
                  <Item variant="outline" className="border-l-4 border-info bg-info/10">
                    <ItemContent>
                      <ItemTitle className="text-lg font-extrabold text-info">{markers.upcomingDeadlines}</ItemTitle>
                      <ItemDescription className="text-info font-semibold">Дедлайни ≤ 14 днів</ItemDescription>
                    </ItemContent>
                  </Item>
                  <Item variant="outline" className="border-l-4 border-warning bg-warning/10">
                    <ItemContent>
                      <ItemTitle className="text-lg font-extrabold text-warning-foreground">{markers.blockedGoals}</ItemTitle>
                      <ItemDescription className="text-warning-foreground font-semibold">Заблоковані цілі</ItemDescription>
                    </ItemContent>
                  </Item>
                </div>
              </TabsContent>

              <TabsContent value="overdue-teams" className="mt-3">
                {markers.overdueTasks === 0 ? (
                  <ItemDescription className="text-sm text-muted-foreground py-3">Немає прострочених задач</ItemDescription>
                ) : (
                  <ItemGroup className="gap-2.5">
                    {Object.entries(markers.overdueByTeam).map(([team, tasks]) => {
                      const firstColor = tasks[0]?.color;
                      const oac = getAccentDef(firstColor);
                      return (
                        <div key={team}>
                          <Item size="xs" className={cn("rounded-t-md gap-1.5", oac.bgLight)}>
                            <ItemMedia className="self-center">
                              <span className={cn("size-2 rounded-full", oac.bg)} />
                            </ItemMedia>
                            <ItemTitle className={cn("text-xs", oac.text)}>{team}</ItemTitle>
                            <ItemActions>
                              <Badge variant="destructive" className="text-[10px] font-semibold">
                                {tasks.length} {tasks.length === 1 ? "задача" : "задач"}
                              </Badge>
                            </ItemActions>
                          </Item>
                          <ItemGroup>
                            {tasks.map((t, i) => (
                              <Item key={i} size="xs" className="bg-destructive/5 rounded-none last:rounded-b-md gap-2 pl-6">
                                <ItemContent className="flex-row items-center gap-2 min-w-0">
                                  <span className="text-[11px] font-semibold truncate">{t.title}</span>
                                  <span className="text-[11px] text-muted-foreground">({t.goal})</span>
                                </ItemContent>
                                <ItemActions>
                                  <span className="text-destructive font-semibold text-[10px] whitespace-nowrap">дедлайн: {medDate(t.endDate)}</span>
                                </ItemActions>
                              </Item>
                            ))}
                          </ItemGroup>
                        </div>
                      );
                    })}
                  </ItemGroup>
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="mt-3">
                {markers.upcomingDeadlines === 0 ? (
                  <ItemDescription className="text-sm text-muted-foreground py-3">Немає цілей з дедлайном у межах 14 днів</ItemDescription>
                ) : (
                  <ItemGroup className="gap-2.5">
                    {Object.entries(markers.upcomingByTeam).map(([team, goals]) => {
                      const firstColor = goals[0]?.color;
                      const uac = getAccentDef(firstColor);
                      return (
                        <div key={team}>
                          <Item size="xs" className={cn("rounded-t-md gap-1.5", uac.bgLight)}>
                            <ItemMedia className="self-center">
                              <span className={cn("size-2 rounded-full", uac.bg)} />
                            </ItemMedia>
                            <ItemTitle className={cn("text-xs", uac.text)}>{team}</ItemTitle>
                            <ItemActions>
                              <Badge variant="outline" className="text-[10px] font-semibold">
                                {goals.length} {goals.length === 1 ? "ціль" : "цілей"}
                              </Badge>
                            </ItemActions>
                          </Item>
                          <ItemGroup>
                            {goals.map((g, i) => (
                              <Item key={i} size="xs" className="bg-info/5 rounded-none last:rounded-b-md gap-2 pl-6">
                                <ItemContent className="flex-row items-center gap-2 min-w-0">
                                  <span className="text-[11px] font-semibold truncate">{g.title || "—"}</span>
                                </ItemContent>
                                <ItemActions>
                                  <span className="text-info font-semibold text-[10px] whitespace-nowrap">дедлайн: {medDate(g.endDate)}</span>
                                </ItemActions>
                              </Item>
                            ))}
                          </ItemGroup>
                        </div>
                      );
                    })}
                  </ItemGroup>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-4 mt-4">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Прогрес */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <BarChart3 className="size-4" /> Прогрес
              </CardTitle>
              <CardDescription>
                По командах: усі цілі, KPI та задачі
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {progressByTeam.length === 0 ? (
                <ItemDescription className="text-center py-8">Немає цілей</ItemDescription>
              ) : (
                <div className="flex flex-col gap-3">
                  {progressByTeam.map((team) => {
                    const teamAccent = getAccentDef(team.color);
                    return (
                      <div key={team.teamLabel} className="rounded-lg border overflow-hidden">
                        <div className={cn("px-3 py-2.5 border-b", teamAccent.bgLight)}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className={cn("text-sm font-bold truncate", teamAccent.text)}>{team.teamLabel}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Цілей: {team.goalCount} · KPI {team.totalDoneKPIs}/{team.totalKPIs} · Задачі {team.totalDoneTasks}/{team.totalTasks}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-bold tabular-nums">{team.pct}%</div>
                              <div className="text-[10px] text-muted-foreground">загальний прогрес</div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <ProgressBar current={team.doneItems} target={team.totalItems} colorClass={teamAccent.bg} />
                          </div>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                          {team.goals.map((g) => {
                            const gac = getAccentDef(g.color);
                            return (
                              <AccordionItem key={g.id} value={g.id} className="border-b px-3 last:border-b-0">
                                <AccordionTrigger>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="font-semibold text-sm truncate">{g.title}</span>
                                    <Badge variant="secondary" className={cn("text-[10px]", gac.text)}>
                                      {g.pct}%
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-2 pb-2">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-muted-foreground">Період: {medDate(g.startDate)} - {medDate(g.endDate)}</span>
                                      <span className="tabular-nums font-semibold">Разом: {g.totalDone}/{g.totalItems}</span>
                                    </div>
                                    <Accordion type="multiple" className="w-full rounded-md border">
                                      <AccordionItem value={`tasks-${g.id}`} className="px-2">
                                        <AccordionTrigger className="py-2">
                                          <div className="flex items-center justify-between w-full gap-2">
                                            <span className="text-[11px] font-semibold">
                                              Задачі {g.doneTasks}/{g.totalTasks} ({g.tasksPct}%)
                                            </span>
                                            <Badge variant="secondary" className={cn("text-[10px]", gac.text)}>
                                              {g.tasksPct}%
                                            </Badge>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-2">
                                          <div className="space-y-2">
                                            <ProgressBar current={g.doneTasks} target={g.totalTasks} colorClass={gac.bg} />
                                            {g.tasks.length === 0 ? (
                                              <ItemDescription className="text-[11px] text-muted-foreground">Немає задач</ItemDescription>
                                            ) : (
                                              <div className="space-y-1.5">
                                                {g.tasks.map((task) => (
                                                  <button
                                                    key={task.id}
                                                    type="button"
                                                    onClick={() => openGoal(g.id)}
                                                    className="w-full text-left rounded-md border px-2 py-1.5 hover:bg-muted/40 transition-colors cursor-pointer"
                                                    title="Відкрити ціль у списку цілей"
                                                  >
                                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                                      <span className="font-medium truncate">{task.title}</span>
                                                      <span className="text-muted-foreground shrink-0">{task.pct}%</span>
                                                    </div>
                                                    <div className="mt-1">
                                                      <ProgressBar current={task.pct} target={100} colorClass={gac.bg} />
                                                    </div>
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                      <AccordionItem value={`kpis-${g.id}`} className="px-2">
                                        <AccordionTrigger className="py-2">
                                          <div className="flex items-center justify-between w-full gap-2">
                                            <span className="text-[11px] font-semibold">
                                              KPI {g.doneKPIs}/{g.totalKPIs} ({g.kpiPct}%)
                                            </span>
                                            <Badge variant="secondary" className={cn("text-[10px]", gac.text)}>
                                              {g.kpiPct}%
                                            </Badge>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-2">
                                          <div className="space-y-2">
                                            <ProgressBar current={g.doneKPIs} target={g.totalKPIs} colorClass={gac.bg} />
                                            {g.kpis.length === 0 ? (
                                              <ItemDescription className="text-[11px] text-muted-foreground">Немає KPI</ItemDescription>
                                            ) : (
                                              <div className="space-y-1.5">
                                                {g.kpis.map((kpi) => (
                                                  <button
                                                    key={kpi.id}
                                                    type="button"
                                                    onClick={() => openGoal(g.id)}
                                                    className="w-full text-left rounded-md border px-2 py-1.5 hover:bg-muted/40 transition-colors cursor-pointer"
                                                    title="Відкрити ціль у списку цілей"
                                                  >
                                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                                      <span className="font-medium truncate">{kpi.name}</span>
                                                      <span className="text-muted-foreground shrink-0">
                                                        {kpi.current}/{kpi.target} {kpi.unit}
                                                      </span>
                                                    </div>
                                                    <div className="mt-1">
                                                      <ProgressBar current={kpi.pct} target={100} colorClass={gac.bg} />
                                                    </div>
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                    <button
                                      type="button"
                                      onClick={() => openGoal(g.id)}
                                      className={cn(
                                        "text-[11px] font-semibold underline-offset-2 hover:underline cursor-pointer",
                                        gac.text,
                                      )}
                                    >
                                      Відкрити в цілях
                                    </button>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Загальний прогрес */}
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <TrendingUp className="size-4" /> Загальний прогрес
              </CardTitle>
              <CardDescription>Цілі · Задачі · Прогрес</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center pb-0">
              <ChartContainer config={overviewConfig} className="mx-auto aspect-square w-full max-w-[220px]">
                <RadialBarChart
                  data={overviewData}
                  innerRadius={40}
                  outerRadius={100}
                  startAngle={90}
                  endAngle={-270}
                  barSize={14}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    dataKey="value"
                    background
                    cornerRadius={5}
                    className="stroke-transparent stroke-2"
                    angleAxisId={0}
                    label={({ cx, cy, value, index }) => {
                      const item = overviewData[index as number];
                      if (!item) return null;
                      const cxN = Number(cx);
                      const cyN = Number(cy);
                      if (!Number.isFinite(cxN) || !Number.isFinite(cyN)) return null;
                      const radii = [50, 70, 90];
                      const r = radii[index as number] ?? 70;
                      const v = typeof value === "number" && Number.isFinite(value) ? value : item.value;
                      return (
                        <text
                          x={cxN + r + 4}
                          y={cyN}
                          textAnchor="start"
                          dominantBaseline="middle"
                          className="fill-muted-foreground text-[10px]"
                        >
                          {item.name} {v}%
                        </text>
                      );
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent nameKey="name" hideLabel />}
                  />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                      content={({ viewBox }) => {
                        const pt = viewBox && svgPoint(viewBox as { cx?: unknown; cy?: unknown });
                        if (!pt) return null;
                        const { cx, cy } = pt;
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={cx} y={cy - 6} className="fill-foreground text-2xl font-bold">
                              {avgPctLabel}%
                            </tspan>
                            <tspan x={cx} y={cy + 12} className="fill-muted-foreground text-[10px]">
                              загалом
                            </tspan>
                          </text>
                        );
                      }}
                    />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-0 pt-2">
              {[
                { label: "Цілей", accentKey: "goals" as const, done: stats.goalsDone, total: stats.totalGoals, pct: goalsPct },
                { label: "Задач", accentKey: "tasks" as const, done: stats.doneTasks, total: stats.totalTasks, pct: tasksPct },
                { label: "KPI", accentKey: "kpi" as const, done: stats.completedKPIs, total: stats.totalKPIs, pct: kpiPct },
              ].map((row, i) => (
                <div key={row.accentKey} className={cn("flex w-full items-center justify-between py-2.5", i > 0 && "border-t border-border")}>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ColorPicker
                      value={overviewAccents[row.accentKey]}
                      onChange={(c) => updateOverviewAccent(row.accentKey, c)}
                      size="sm"
                    />
                    {row.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {row.done}/{row.total} <span className="text-muted-foreground">({row.pct}%)</span>
                  </span>
                </div>
              ))}
            </CardFooter>
          </Card>

        </div>
      </div>

    </div>
  );
}
