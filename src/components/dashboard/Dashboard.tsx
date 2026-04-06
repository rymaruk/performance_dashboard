import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Label,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { ProgressBar } from "../ui/progress-bar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import type { ChartConfig } from "../ui/chart";
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemMedia,
  ItemActions,
} from "../ui/item";
import { roleColor } from "../../utils/roleColor";
import { medDate, diffDays, today } from "../../utils/date";
import type { Project, ProjectStats, Role } from "../../types";
import { AlertTriangle, BarChart3, Target, Users, TrendingUp } from "lucide-react";

interface DashboardProps {
  proj: Project;
  stats: ProjectStats;
}





export function Dashboard({ proj, stats }: DashboardProps) {
  const teamStats = useMemo(() => {
    const map: Record<string, { total: number; done: number; inProgress: number }> = {};
    proj.goals.forEach((g) => {
      g.tasks.forEach((t) => {
        const key = t.assignee;
        if (!map[key]) map[key] = { total: 0, done: 0, inProgress: 0 };
        map[key].total++;
        if (t.status === "Done") map[key].done++;
        if (t.status === "In Progress") map[key].inProgress++;
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([role, s]) => ({ role: role as Role, ...s, pct: s.total ? Math.round((s.done / s.total) * 100) : 0 }));
  }, [proj]);

  const prioStats = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    proj.goals.forEach((g) => {
      const key = g.priority;
      if (!map[key]) map[key] = { total: 0, done: 0 };
      map[key].total++;
      if (g.status === "Завершено") map[key].done++;
    });
    return Object.entries(map).map(([prio, s]) => ({ prio, ...s, pct: s.total ? Math.round((s.done / s.total) * 100) : 0 }));
  }, [proj]);

  interface KpiItem { name: string; current: number; target: number; unit: string; pct: number; done: boolean; goal: string }
  interface TeamKpi { role: Role; kpis: KpiItem[]; totalDone: number; totalCount: number; pct: number }

  const kpiAgg = useMemo(() => {
    let completed = 0, total = 0;
    const byTeam: Record<string, KpiItem[]> = {};
    proj.goals.forEach((g) => {
      const team = g.owner;
      if (!byTeam[team]) byTeam[team] = [];
      g.kpis.forEach((k) => {
        total++;
        const isDone = k.current >= k.target;
        if (isDone) completed++;
        byTeam[team].push({ name: k.name, current: k.current, target: k.target, unit: k.unit, pct: k.target ? Math.round((k.current / k.target) * 100) : 0, done: isDone, goal: g.title || "—" });
      });
    });
    const teams: TeamKpi[] = Object.entries(byTeam)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([role, kpis]) => {
        const totalDone = kpis.filter((k) => k.done).length;
        return { role: role as Role, kpis, totalDone, totalCount: kpis.length, pct: kpis.length ? Math.round((totalDone / kpis.length) * 100) : 0 };
      });
    return { completed, total, teams };
  }, [proj]);

  const markers = useMemo(() => {
    const now = today();
    let overdueTasks = 0, blockedGoals = 0, upcomingDeadlines = 0;
    const overdueByTeam: Record<string, { title: string; endDate: string; goal: string }[]> = {};
    proj.goals.forEach((g) => {
      if (g.status === "Заблоковано") blockedGoals++;
      const daysLeft = diffDays(now, g.endDate);
      if (daysLeft >= 0 && daysLeft <= 14 && g.status !== "Завершено") upcomingDeadlines++;
      g.tasks.forEach((t) => {
        if (t.status !== "Done" && t.endDate < now) {
          overdueTasks++;
          const team = t.assignee;
          if (!overdueByTeam[team]) overdueByTeam[team] = [];
          overdueByTeam[team].push({ title: t.title, endDate: t.endDate, goal: g.title });
        }
      });
    });
    return { overdueTasks, blockedGoals, upcomingDeadlines, overdueByTeam };
  }, [proj]);

  const prioColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  const goalsPct = stats.totalGoals > 0 ? Math.round((stats.goalsDone / stats.totalGoals) * 100) : 0;
  const tasksPct = stats.taskPct;
  const kpiPct = stats.kpiPct;
  const avgPct = Math.round((goalsPct + tasksPct + kpiPct) / 3);

  const overviewData = [
    { name: "KPI", value: kpiPct, fill: "var(--chart-3)" },
    { name: "Задачі", value: tasksPct, fill: "var(--chart-2)" },
    { name: "Цілі", value: goalsPct, fill: "var(--chart-1)" },
  ];
  const overviewConfig: ChartConfig = {
    "Цілі": { label: "Цілі", color: "var(--chart-1)" },
    "Задачі": { label: "Задачі", color: "var(--chart-2)" },
    "KPI": { label: "KPI", color: "var(--chart-3)" },
  };

  return (
    <div>
      {/* Alert markers */}
      {(markers.overdueTasks > 0 || markers.blockedGoals > 0 || markers.upcomingDeadlines > 0) && (
        <div className="flex gap-2.5 mx-4 mt-4 flex-wrap">
          {markers.overdueTasks > 0 && (
            <Item variant="outline" className="flex-1 min-w-[140px] border-l-4 border-destructive bg-destructive/10">
              <ItemContent>
                <ItemTitle className="text-lg font-extrabold text-destructive">{markers.overdueTasks}</ItemTitle>
                <ItemDescription className="text-destructive font-semibold">Прострочені задачі</ItemDescription>
              </ItemContent>
            </Item>
          )}
          {markers.blockedGoals > 0 && (
            <Item variant="outline" className="flex-1 min-w-[140px] border-l-4 border-warning bg-warning/10">
              <ItemContent>
                <ItemTitle className="text-lg font-extrabold text-warning-foreground">{markers.blockedGoals}</ItemTitle>
                <ItemDescription className="text-warning-foreground font-semibold">Заблоковані цілі</ItemDescription>
              </ItemContent>
            </Item>
          )}
          {markers.upcomingDeadlines > 0 && (
            <Item variant="outline" className="flex-1 min-w-[140px] border-l-4 border-info bg-info/10">
              <ItemContent>
                <ItemTitle className="text-lg font-extrabold text-info">{markers.upcomingDeadlines}</ItemTitle>
                <ItemDescription className="text-info font-semibold">Дедлайни ≤ 14 днів</ItemDescription>
              </ItemContent>
            </Item>
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-4 mt-4">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* KPI по командах */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <BarChart3 className="size-4" /> KPI по командах
              </CardTitle>
              <CardDescription>
                Виконано {stats.completedKPIs} з {stats.totalKPIs} ({kpiPct}%)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {kpiAgg.teams.length === 0 ? (
                <ItemDescription className="text-center py-8">Немає KPI</ItemDescription>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                  {kpiAgg.teams.map((t) => {
                    const rc = roleColor(t.role);
                    const teamDone = t.totalDone;
                    const teamRemaining = t.totalCount - t.totalDone;
                    const teamConfig: ChartConfig = {
                      done: { label: "Виконано", color: rc.fill },
                      remaining: { label: "Залишилось", color: "var(--muted)" },
                    };
                    return (
                      <Card key={t.role} className="flex flex-col">
                        <CardContent>
                          <ChartContainer config={teamConfig} className="mx-auto aspect-square max-h-[200px]">
                            <RadialBarChart
                              data={[{ done: teamDone, remaining: teamRemaining }]}
                              innerRadius={60}
                              outerRadius={85}
                              startAngle={90}
                              endAngle={90 - (t.totalCount > 0 ? (teamDone / t.totalCount) * 360 : 0)}
                            >
                              <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-transparent" polarRadius={[63, 57]} />
                              <RadialBar dataKey="done" fill="var(--color-done)" background cornerRadius={6} className="stroke-transparent stroke-2" />
                              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                                <Label
                                  content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                      return (
                                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 8} className="fill-foreground text-2xl font-bold">
                                            {t.pct}%
                                          </tspan>
                                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 12} className="fill-muted-foreground text-xs">
                                            {teamDone}/{t.totalCount} KPI
                                          </tspan>
                                        </text>
                                      );
                                    }
                                  }}
                                />
                              </PolarRadiusAxis>
                            </RadialBarChart>
                          </ChartContainer>
                        </CardContent>
                        <CardFooter className="flex-col px-4 pb-0">
                          <Accordion
                            type="single"
                            collapsible
                            className="w-full rounded-lg border"
                            defaultValue={Object.keys(
                              t.kpis.reduce<Record<string, boolean>>((acc, k) => { acc[k.goal] = true; return acc; }, {}),
                            )[0]}
                          >
                            {(() => {
                              const byGoal: Record<string, typeof t.kpis> = {};
                              t.kpis.forEach((k) => {
                                if (!byGoal[k.goal]) byGoal[k.goal] = [];
                                byGoal[k.goal].push(k);
                              });
                              return Object.entries(byGoal).map(([goal, kpis]) => {
                                const goalDone = kpis.filter((k) => k.done).length;
                                return (
                                  <AccordionItem key={goal} value={goal} className="border-b px-4 last:border-b-0">
                                    <AccordionTrigger>
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className="font-semibold text-sm">{goal}</span>
                                        <span className="text-xs text-muted-foreground ml-auto mr-2">
                                          {goalDone}/{kpis.length} KPI
                                        </span>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>KPI</TableHead>
                                            <TableHead className="text-right">Поточне</TableHead>
                                            <TableHead className="text-right">%</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {kpis.map((k, i) => (
                                            <TableRow key={i}>
                                              <TableCell className={cn("font-medium", k.done ? "text-success" : "text-foreground")}>
                                                {k.done ? "✓ " : ""}{k.name}
                                              </TableCell>
                                              <TableCell className={cn("text-right tabular-nums font-semibold", k.done ? "text-success" : "text-foreground")}>
                                                {k.current}/{k.target} {k.unit}
                                              </TableCell>
                                              <TableCell className={cn("text-right tabular-nums font-semibold", k.done ? "text-success" : "text-muted-foreground")}>
                                                {Math.min(k.pct, 999)}%
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                        <TableFooter>
                                          <TableRow>
                                            <TableCell>Разом</TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums text-success">
                                              {goalDone}/{kpis.length}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums">
                                              {kpis.length > 0 ? Math.round((goalDone / kpis.length) * 100) : 0}%
                                            </TableCell>
                                          </TableRow>
                                        </TableFooter>
                                      </Table>
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              });
                            })()}
                          </Accordion>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
              
            </CardContent>
          </Card>

          {/* Задачі по командах + По пріоритету */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Users className="size-4" /> Задачі по командах
              </CardTitle>
              <CardDescription>Прогрес виконання по кожній команді</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {teamStats.length === 0 ? (
                <ItemDescription className="text-center py-8">Немає задач</ItemDescription>
              ) : (
                <div className="flex flex-col gap-3">
                  {teamStats.map((t) => {
                    const rc = roleColor(t.role);
                    return (
                      <div key={t.role} className="flex items-center gap-3">
                        <span className={cn("text-xs font-bold w-[80px] shrink-0 truncate", rc.text)}>{t.role}</span>
                        <div className="flex-1 min-w-0">
                          <ProgressBar current={t.done} target={t.total} colorClass={rc.bg} />
                        </div>
                        <span className="text-xs tabular-nums font-semibold shrink-0 w-[52px] text-right">
                          {t.done}/{t.total}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 w-[32px] text-right">
                          {t.pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* По пріоритету */}
              {prioStats.length > 0 && (
                <div className="border-t border-border pt-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Target className="size-3.5" /> По пріоритету
                  </div>
                  <div className="flex flex-col gap-3">
                    {prioStats.map((p, i) => (
                      <div key={p.prio} className="flex items-center gap-3">
                        <span className="flex items-center gap-2 text-xs w-[80px] shrink-0 truncate text-muted-foreground">
                          <span className="size-2.5 rounded-sm shrink-0" style={{ background: prioColors[i % prioColors.length] }} />
                          {p.prio}
                        </span>
                        <div className="flex-1 min-w-0 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${p.pct}%`, background: prioColors[i % prioColors.length] }}
                          />
                        </div>
                        <span className="text-xs tabular-nums font-semibold shrink-0 w-[52px] text-right">
                          {p.done}/{p.total}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 w-[32px] text-right">
                          {p.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <span className="text-[11px] text-muted-foreground">
                Усього {teamStats.reduce((a, t) => a + t.total, 0)} задач · {teamStats.reduce((a, t) => a + t.done, 0)} виконано
              </span>
            </CardFooter>
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
                      const radii = [50, 70, 90];
                      const r = radii[index as number] ?? 70;
                      return (
                        <text
                          x={Number(cx) + r + 4}
                          y={cy}
                          textAnchor="start"
                          dominantBaseline="middle"
                          className="fill-muted-foreground text-[10px]"
                        >
                          {item.name} {value}%
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
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 6} className="fill-foreground text-2xl font-bold">
                                {avgPct}%
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 12} className="fill-muted-foreground text-[10px]">
                                загалом
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-0 pt-2">
              {[
                { label: "Цілей", done: stats.goalsDone, total: stats.totalGoals, pct: goalsPct, color: "bg-chart-1" },
                { label: "Задач", done: stats.doneTasks, total: stats.totalTasks, pct: tasksPct, color: "bg-chart-2" },
                { label: "KPI", done: stats.completedKPIs, total: stats.totalKPIs, pct: kpiPct, color: "bg-chart-3" },
              ].map((row, i) => (
                <div key={i} className={cn("flex w-full items-center justify-between py-2.5", i > 0 && "border-t border-border")}>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={cn("size-2.5 rounded-sm", row.color)} />
                    {row.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {row.done}/{row.total} <span className="text-muted-foreground">({row.pct}%)</span>
                  </span>
                </div>
              ))}
            </CardFooter>
          </Card>

          {/* Прогрес цілей */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <BarChart3 className="size-4" /> Прогрес цілей
              </CardTitle>
              <CardDescription>Задачі і KPI по кожній цілі</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {proj.goals.map((g) => {
                  const doneTasks = g.tasks.filter((t) => t.status === "Done").length;
                  const doneKPIs = g.kpis.filter((k) => k.current >= k.target).length;
                  const rc = roleColor(g.owner);
                  const taskTotal = g.tasks.length;
                  const kpiTotal = g.kpis.length;

                  return (
                    <div key={g.id} className={cn("rounded-lg border overflow-hidden", rc.bgLight, rc.border)}>
                      <div className="px-3 pt-3 pb-1">
                        <div className="text-[13px] font-bold truncate">{g.title || "—"}</div>
                        <div className="flex gap-1.5 items-center mt-1 flex-wrap">
                          <Badge variant="secondary" className={cn("text-[10px]", rc.text)}>{g.owner}</Badge>
                          <Badge variant="outline" className="text-[10px]">📅 {medDate(g.startDate)} – {medDate(g.endDate)}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                          <div>
                            <span className="text-muted-foreground">Задачі</span>
                            <span className={cn("ml-1 font-bold", rc.text)}>{doneTasks}/{taskTotal}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">KPI</span>
                            <span className="ml-1 font-bold text-chart-2">{doneKPIs}/{kpiTotal}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 px-3 pb-2.5 pt-1">
                        <ProgressBar current={doneTasks} target={taskTotal} colorClass={rc.bg} />
                        <ProgressBar current={doneKPIs} target={kpiTotal} colorClass="bg-chart-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Overdue tasks */}
      {markers.overdueTasks > 0 && (
        <Card className="mx-4 mt-4">
          <CardHeader>
            <CardTitle className="text-sm text-destructive flex items-center gap-1.5">
              <AlertTriangle className="size-4" /> Прострочені задачі по командах
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ItemGroup className="gap-2.5">
              {Object.entries(markers.overdueByTeam).map(([team, tasks]) => {
                const rc = roleColor(team as Role);
                return (
                  <div key={team}>
                    <Item size="xs" className={cn("rounded-t-md gap-1.5", rc.bgLight)}>
                      <ItemMedia className="self-center">
                        <span className={cn("size-2 rounded-full", rc.bg)} />
                      </ItemMedia>
                      <ItemTitle className={cn("text-xs", rc.text)}>{team}</ItemTitle>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
