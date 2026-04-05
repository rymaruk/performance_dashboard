import { useMemo } from "react";
import clsx from "clsx";
import { Progress } from "../ui";
import { roleColor } from "../../utils/roleColor";
import { medDate, diffDays, today } from "../../utils/date";
import type { Project, ProjectStats, Role } from "../../types";

interface DashboardProps {
  proj: Project;
  stats: ProjectStats;
}

const statCardDefs = [
  { l: "Цілей", bg: "bg-purple-50", c: "text-purple-700", key: "goals" },
  { l: "KPI", bg: "bg-primary-50", c: "text-primary-700", key: "kpi" },
  { l: "Задач", bg: "bg-orange-50", c: "text-orange-700", key: "tasks" },
  { l: "Прогрес", bg: "bg-green-50", c: "text-green-700", key: "progress" },
] as const;

const statusColorMap: Record<string, string> = {
  "Планується": "bg-gray-400",
  "В процесі": "bg-primary-500",
  "На ревʼю": "bg-orange-500",
  "Завершено": "bg-green-500",
  "Заблоковано": "bg-red-500",
};

export function Dashboard({ proj, stats }: DashboardProps) {
  const statValues: Record<string, { v: string | number; sub: string }> = {
    goals: { v: stats.totalGoals, sub: `${stats.goalsDone} завершено` },
    kpi: { v: stats.totalKPIs, sub: `${stats.completedKPIs} ок (${stats.kpiPct}%)` },
    tasks: { v: stats.totalTasks, sub: `${stats.doneTasks} done · ${stats.inProgress} wip` },
    progress: { v: `${stats.taskPct}%`, sub: "задач завершено" },
  };

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

  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    proj.goals.forEach((g) => { map[g.status] = (map[g.status] || 0) + 1; });
    return Object.entries(map);
  }, [proj]);

  const card = "bg-white rounded-lg m-4 p-5 shadow-sm";

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mx-4 mt-4">
        {statCardDefs.map((def) => {
          const sv = statValues[def.key];
          return (
            <div key={def.key} className={clsx("rounded-lg px-4.5 py-3.5", def.bg)}>
              <div className={clsx("text-[26px] font-extrabold", def.c)}>{sv.v}</div>
              <div className={clsx("text-[11px] font-semibold", def.c)}>{def.l}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{sv.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Alert markers */}
      {(markers.overdueTasks > 0 || markers.blockedGoals > 0 || markers.upcomingDeadlines > 0) && (
        <div className="flex gap-2.5 mx-4 mt-0 flex-wrap">
          {markers.overdueTasks > 0 && (
            <div className="flex-1 min-w-[140px] px-3.5 py-2.5 rounded-lg bg-red-50 border-l-4 border-red-500">
              <div className="text-lg font-extrabold text-red-700">{markers.overdueTasks}</div>
              <div className="text-[10px] font-semibold text-red-700">Прострочені задачі</div>
            </div>
          )}
          {markers.blockedGoals > 0 && (
            <div className="flex-1 min-w-[140px] px-3.5 py-2.5 rounded-lg bg-orange-50 border-l-4 border-orange-500">
              <div className="text-lg font-extrabold text-orange-700">{markers.blockedGoals}</div>
              <div className="text-[10px] font-semibold text-orange-700">Заблоковані цілі</div>
            </div>
          )}
          {markers.upcomingDeadlines > 0 && (
            <div className="flex-1 min-w-[140px] px-3.5 py-2.5 rounded-lg bg-primary-50 border-l-4 border-primary-500">
              <div className="text-lg font-extrabold text-primary-700">{markers.upcomingDeadlines}</div>
              <div className="text-[10px] font-semibold text-primary-700">Дедлайни ≤ 14 днів</div>
            </div>
          )}
        </div>
      )}

      {/* Team breakdown + Status */}
      <div className="grid grid-cols-2">
        <div className={card}>
          <div className="text-sm font-bold mb-3">👥 Задачі по командах</div>
          {teamStats.length === 0 ? (
            <div className="text-[11px] text-gray-400">Немає задач</div>
          ) : (
            teamStats.map((t) => {
              const rc = roleColor(t.role);
              return (
                <div key={t.role} className={clsx("mb-2.5 px-3 py-2 rounded-md border-l-[3px]", rc.bg50, `border-l-[var(--tw-border-opacity,1)]`)}>
                  <div className="flex justify-between items-center mb-1" style={{ borderLeftColor: undefined }}>
                    <span className={clsx("text-xs font-bold", rc.text700)}>{t.role}</span>
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-gray-500">Усього: <b className={rc.text700}>{t.total}</b></span>
                      <span className="text-gray-500">Done: <b className="text-green-700">{t.done}</b></span>
                      <span className="text-gray-500">WIP: <b className="text-primary-700">{t.inProgress}</b></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Progress current={t.done} target={t.total} colorClass={rc.bg500} />
                    </div>
                    <span className={clsx("text-[11px] font-bold min-w-[32px] text-right", rc.text700)}>{t.pct}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col">
          <div className={card}>
            <div className="text-sm font-bold mb-3">📊 Статус цілей</div>
            <div className="flex gap-1 h-6 rounded-md overflow-hidden mb-2.5">
              {statusDist.map(([status, count]) => (
                <div
                  key={status}
                  className={clsx("flex items-center justify-center text-[9px] font-bold text-white", statusColorMap[status] || "bg-gray-400")}
                  style={{ flex: count, minWidth: count > 0 ? 20 : 0 }}
                  title={`${status}: ${count}`}
                >
                  {count}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {statusDist.map(([status, count]) => (
                <div key={status} className="flex items-center gap-1 text-[10px]">
                  <span className={clsx("w-2 h-2 rounded-sm", statusColorMap[status] || "bg-gray-400")} />
                  <span className="text-gray-600">{status}</span>
                  <span className="font-bold text-gray-800">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={card}>
            <div className="text-sm font-bold mb-3">🎯 По пріоритету</div>
            {prioStats.map((p) => (
              <div key={p.prio} className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] min-w-[110px] font-semibold">{p.prio}</span>
                <div className="flex-1"><Progress current={p.done} target={p.total} /></div>
                <span className="text-[10px] text-gray-600 min-w-[50px] text-right">{p.done}/{p.total} ({p.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI by team */}
      <div className={card}>
        <div className="flex justify-between items-center mb-3.5">
          <div className="text-sm font-bold">📈 KPI зведення по командах</div>
          <div className="flex gap-3 text-[11px]">
            <span className="text-gray-500">Виконано: <b className="text-green-700">{kpiAgg.completed}/{kpiAgg.total}</b></span>
            <span className="text-gray-500">Досягнення: <b className="text-primary-700">{kpiAgg.total ? Math.round((kpiAgg.completed / kpiAgg.total) * 100) : 0}%</b></span>
          </div>
        </div>

        <div className="mb-3.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-gray-600">Загальний прогрес</span>
            <span className="text-[11px] font-bold text-primary-700 ml-auto">{kpiAgg.completed}/{kpiAgg.total} ({kpiAgg.total ? Math.round((kpiAgg.completed / kpiAgg.total) * 100) : 0}%)</span>
          </div>
          <Progress current={kpiAgg.completed} target={kpiAgg.total} />
        </div>

        {kpiAgg.teams.length === 0 ? (
          <div className="text-[11px] text-gray-400">Немає KPI</div>
        ) : (
          kpiAgg.teams.map((t) => {
            const rc = roleColor(t.role);
            return (
              <div key={t.role} className={clsx("mb-3 px-3 py-2.5 rounded-lg border-l-[3px]", rc.bg50)}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className={clsx("text-xs font-bold", rc.text700)}>{t.role}</span>
                  <div className="flex gap-2 items-center text-[10px]">
                    <span className="text-gray-500">Виконано: <b className="text-green-700">{t.totalDone}/{t.totalCount}</b></span>
                    <span className={clsx("font-bold text-xs", rc.text700)}>{t.pct}%</span>
                  </div>
                </div>
                <div className="mb-2"><Progress current={t.totalDone} target={t.totalCount} colorClass={rc.bg500} /></div>

                {t.kpis.map((k, i) => (
                  <div key={i} className={clsx("flex items-center gap-2 py-1", i === 0 && "border-t border-gray-200", "border-b border-gray-100")}>
                    <span className={clsx("text-[10px] font-semibold min-w-[130px] truncate", k.done ? "text-green-700" : "text-gray-800")} title={`${k.name} (${k.goal})`}>
                      {k.done ? "✓ " : ""}{k.name}
                    </span>
                    <div className="flex-1">
                      <Progress current={k.current} target={k.target} colorClass={k.done ? "bg-green-500" : k.pct >= 50 ? "bg-primary-500" : "bg-orange-500"} />
                    </div>
                    <span className="text-[9px] text-gray-500 min-w-[70px] text-right whitespace-nowrap">
                      <b className={k.done ? "text-green-700" : "text-gray-800"}>{k.current}</b>/{k.target} {k.unit}
                    </span>
                    <span className={clsx("text-[10px] font-bold min-w-[32px] text-right", k.done ? "text-green-700" : "text-gray-600")}>
                      {Math.min(k.pct, 999)}%
                    </span>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Overdue */}
      {markers.overdueTasks > 0 && (
        <div className={card}>
          <div className="text-sm font-bold mb-2.5 text-red-700">⚠️ Прострочені задачі по командах</div>
          {Object.entries(markers.overdueByTeam).map(([team, tasks]) => {
            const rc = roleColor(team as Role);
            return (
              <div key={team} className="mb-2.5">
                <div className={clsx("flex items-center gap-1.5 mb-1 px-2 py-1 rounded", rc.bg50)}>
                  <span className={clsx("w-2 h-2 rounded-full", rc.bg700)} />
                  <span className={clsx("text-xs font-bold", rc.text700)}>{team}</span>
                  <span className="text-[10px] text-red-600 font-semibold ml-auto">{tasks.length} {tasks.length === 1 ? "задача" : "задач"}</span>
                </div>
                {tasks.map((t, i) => (
                  <div key={i} className="flex justify-between items-center px-2.5 py-1 pl-5.5 mb-0.5 rounded bg-red-50 text-[11px]">
                    <div>
                      <span className="font-semibold">{t.title}</span>
                      <span className="text-gray-400 ml-2">({t.goal})</span>
                    </div>
                    <span className="text-red-600 font-semibold text-[10px] whitespace-nowrap">дедлайн: {medDate(t.endDate)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Goal progress */}
      <div className={card}>
        <div className="text-[15px] font-bold mb-3.5">📊 Прогрес цілей</div>
        {proj.goals.map((g) => {
          const doneTasks = g.tasks.filter((t) => t.status === "Done").length;
          const doneKPIs = g.kpis.filter((k) => k.current >= k.target).length;
          const rc = roleColor(g.owner);
          return (
            <div key={g.id} className={clsx("mb-3.5 px-4 py-3 rounded-lg border-l-4", rc.bg50)}>
              <div className="flex justify-between flex-wrap gap-1 mb-1.5">
                <span className="font-bold text-[13px]">{g.title || "—"}</span>
                <div className="flex gap-1.5 items-center">
                  <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold", rc.bg100, rc.text700)}>{g.owner}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 font-semibold text-gray-700">📅 {medDate(g.startDate)} – {medDate(g.endDate)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">Задачі ({doneTasks}/{g.tasks.length})</div>
                  <Progress current={doneTasks} target={g.tasks.length} colorClass={rc.bg500} />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">KPI ({doneKPIs}/{g.kpis.length})</div>
                  <Progress current={doneKPIs} target={g.kpis.length} colorClass="bg-teal-500" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
