import { useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getAccentDef } from "../../constants";
import { DateRangePicker } from "../ui";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { GANTT_PX } from "../../constants";
import { FilterSelect } from "../ui/FilterSelect";
import { Button } from "../ui/button";
import { useDragBar } from "../../hooks/useDragBar";
import { Calendar, Link as LinkIcon, X, ZoomIn, ZoomOut } from "lucide-react";
import type { Goal, Task, GanttMonth, GanttRange, Project, Team, UserProfile } from "../../types";

interface GanttProps {
  proj: Project;
  teams: Team[];
  teamUsers: Record<string, UserProfile[]>;
  ganttRange: GanttRange;
  ganttMonths: GanttMonth[];
  ganttExpanded: Record<string, boolean>;
  onToggleGoal: (id: string) => void;
  onChangeGoalDates: (gid: string, field: "startDate" | "endDate", val: string) => void;
  onChangeGoalDateRange: (gid: string, newStart: string, newEnd: string) => void;
  onChangeTaskDateRange: (gid: string, tid: string, newStart: string, newEnd: string) => void;
  onChangeTaskDates: (gid: string, tid: string, field: "startDate" | "endDate", val: string) => void;
}

/* ── Column resize handle ── */

function ColResizeHandle({ onDelta }: { onDelta: (deltaPx: number) => void }) {
  const startX = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      startX.current = e.clientX;
      (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const delta = e.clientX - startX.current;
      startX.current = e.clientX;
      onDelta(delta);
      e.preventDefault();
      e.stopPropagation();
    },
    [onDelta],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.target as HTMLDivElement).releasePointerCapture(e.pointerId);
    },
    [],
  );

  return (
    <div
      className="absolute top-0 bottom-0 w-[5px] -right-[2px] z-[3] cursor-col-resize hover:bg-primary/20 active:bg-primary/30 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}

function MonthBg({ ganttMonths, pxPerDay }: { ganttMonths: GanttMonth[]; pxPerDay: number }) {
  let acc = 0;
  return (
    <>
      {ganttMonths.map((m, i) => {
        const w = m.days * pxPerDay;
        const el = (
          <div
            key={i}
            className={cn("absolute top-0 bottom-0 border-l border-border", i % 2 ? "bg-muted/30" : "bg-transparent")}
            style={{ left: acc, width: w }}
          />
        );
        acc += w;
        return el;
      })}
    </>
  );
}

/* ── Draggable Goal Bar ── */

function GoalBar({
  goal,
  barLeft,
  barWidth,
  pxPerDay,
  ganttStart,
  pct,
  colorBg,
  onDragCommit,
  onChangeStart,
  onChangeEnd,
}: {
  goal: Goal;
  barLeft: number;
  barWidth: number;
  pxPerDay: number;
  ganttStart: string;
  pct: number;
  colorBg: string;
  onDragCommit: (newStart: string, newEnd: string) => void;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}) {
  const { barRef, dragPos, isDragging, handlers } = useDragBar({
    startDate: goal.startDate,
    endDate: goal.endDate,
    pxPerDay,
    ganttStart,
    onCommit: onDragCommit,
  });

  const left = isDragging ? dragPos!.left : barLeft;
  const width = isDragging ? dragPos!.width : barWidth;

  return (
    <div
      ref={barRef}
      className={cn(
        "absolute top-1 h-[18px] rounded flex items-center justify-between px-1 shadow-sm overflow-visible select-none touch-none",
        colorBg,
        isDragging && "opacity-80 z-10",
      )}
      style={{ left, width, cursor: isDragging ? "grabbing" : undefined }}
      {...handlers}
    >
      {
        <DateRangePicker
          startDate={goal.startDate}
          endDate={goal.endDate}
          onChangeStart={onChangeStart}
          onChangeEnd={onChangeEnd}
          size="sm"
          variant="gantt"
        />
      }
      <span className="text-[9px] text-primary-foreground/80 font-semibold shrink-0">{pct}%</span>
    </div>
  );
}

/* ── Draggable Task Bar ── */

function TaskBar({
  task,
  goalStartDate,
  goalEndDate,
  barLeft,
  barWidth,
  pxPerDay,
  ganttStart,
  colorBg,
  isDone,
  onDragCommit,
  onChangeStart,
  onChangeEnd,
}: {
  task: Task;
  goalStartDate: string;
  goalEndDate: string;
  barLeft: number;
  barWidth: number;
  pxPerDay: number;
  ganttStart: string;
  colorBg: string;
  isDone: boolean;
  onDragCommit: (newStart: string, newEnd: string) => void;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}) {
  const { barRef, dragPos, isDragging, handlers } = useDragBar({
    startDate: task.startDate,
    endDate: task.endDate,
    pxPerDay,
    ganttStart,
    minDate: goalStartDate,
    maxDate: goalEndDate,
    onCommit: onDragCommit,
  });

  const left = isDragging ? dragPos!.left : barLeft;
  const width = isDragging ? dragPos!.width : barWidth;

  return (
    <div
      ref={barRef}
      className={cn(
        "absolute top-1 h-3 rounded-sm opacity-80 flex items-center justify-center overflow-visible select-none touch-none",
        isDone ? "bg-muted-foreground" : colorBg,
        isDragging && "opacity-60 z-10",
      )}
      style={{ left, width, cursor: isDragging ? "grabbing" : undefined }}
      {...handlers}
    >
      {barWidth > 50 && (
        <DateRangePicker
          startDate={task.startDate}
          endDate={task.endDate}
          onChangeStart={onChangeStart}
          onChangeEnd={onChangeEnd}
          minDate={goalStartDate}
          maxDate={goalEndDate}
          size="sm"
          variant="gantt"
        />
      )}
    </div>
  );
}

/* ── Main Gantt ── */

export function Gantt({
  proj,
  teams,
  teamUsers,
  ganttRange,
  ganttMonths,
  ganttExpanded,
  onToggleGoal,
  onChangeGoalDates,
  onChangeGoalDateRange,
  onChangeTaskDateRange,
  onChangeTaskDates,
}: GanttProps) {
  const teamName = (teamId: string | null | undefined) =>
    teams.find((t) => t.id === teamId)?.name ?? "Без команди";

  const userName = useCallback(
    (userId: string | null | undefined): string | null => {
      if (!userId) return null;
      for (const users of Object.values(teamUsers)) {
        const u = users.find((x) => x.id === userId);
        if (u) return `${u.first_name} ${u.last_name}`;
      }
      return null;
    },
    [teamUsers],
  );

  /* ── Filters (synced with URL) ── */
  const [searchParams, setSearchParams] = useSearchParams();
  const filterTeam = searchParams.get("team");
  const filterUser = searchParams.get("user");

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

  const teamOptions = useMemo(() => teams.map((t) => `${t.name}::${t.id}`), [teams]);

  const teamFilterId = useMemo(() => {
    if (!filterTeam) return null;
    const sep = filterTeam.indexOf("::");
    return sep >= 0 ? filterTeam.slice(sep + 2) : null;
  }, [filterTeam]);

  const allUsers = useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const users of Object.values(teamUsers)) {
      for (const u of users) map.set(u.id, u);
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

  const filteredGoals = useMemo(() => {
    return proj.goals.filter((g) => {
      if (teamFilterId && g.team_id !== teamFilterId) return false;
      if (userFilterId) {
        const hasMatchingTask = g.tasks.some((t) => t.user_id === userFilterId);
        if (!hasMatchingTask) return false;
      }
      return true;
    });
  }, [proj.goals, teamFilterId, userFilterId]);

  const hasFilters = Boolean(filterTeam || filterUser);

  /* ── Column widths ── */
  const [colNameW, setColNameW] = useState(260);
  const [colWhoW, setColWhoW] = useState(80);

  /* ── Zoom ── */
  const MIN_CHART_W = 400;
  const MAX_CHART_W = 4000;
  const [chartWidth, setChartWidth] = useState(GANTT_PX);
  const pxPerDay = chartWidth / Math.max(ganttRange.totalDays, 1);

  const barPos = (sd: string, ed: string) => {
    const diff = (a: string, b: string) =>
      Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
    return {
      left: Math.max(0, diff(ganttRange.start, sd)) * pxPerDay,
      width: Math.max((diff(sd, ed) + 1) * pxPerDay, 8),
    };
  };

  return (
    <div>
      <Card className="m-4 overflow-x-auto">
        <CardHeader>
          <CardTitle className="text-[15px] flex items-center gap-1.5">
            <Calendar className="size-4" /> Діаграма Ганта
          </CardTitle>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-[11px] text-muted-foreground">
              Перетягуйте бари для зміни дат. Клік на ціль — розгорнути задачі.
            </div>
            {proj.goals.length > 0 && (
              <div className="flex items-center gap-2">
                <ZoomOut className="size-3.5 text-muted-foreground" />
                <input
                  type="range"
                  min={MIN_CHART_W}
                  max={MAX_CHART_W}
                  step={50}
                  value={chartWidth}
                  onChange={(e) => setChartWidth(Number(e.target.value))}
                  className="w-24 h-1.5 accent-primary cursor-pointer"
                />
                <ZoomIn className="size-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground tabular-nums w-8">
                  {Math.round((chartWidth / GANTT_PX) * 100)}%
                </span>
              </div>
            )}
          </div>
          {proj.goals.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] font-semibold text-muted-foreground">Фільтри:</span>
              <FilterSelect
                label="Команда"
                value={filterTeam}
                options={teamOptions}
                onChange={(v) => setFilter("team", v)}
                renderOption={(opt) => {
                  const sep = opt.indexOf("::");
                  return sep >= 0 ? opt.slice(0, sep) : opt;
                }}
              />
              <FilterSelect
                label="Користувач"
                value={filterUser}
                options={userOptions}
                onChange={(v) => setFilter("user", v)}
                renderOption={(opt) => {
                  const sep = opt.indexOf("::");
                  return sep >= 0 ? opt.slice(0, sep) : opt;
                }}
              />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchParams({}, { replace: true })}
                  className="text-destructive hover:text-destructive/80 h-7"
                >
                  <X className="size-3" /> Скинути
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {proj.goals.length === 0 ? (
            <Empty className="border-0 md:p-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Calendar />
                </EmptyMedia>
                <EmptyTitle>Немає цілей для діаграми</EmptyTitle>
                <EmptyDescription>
                  Після додавання цілей тут зʼявиться шкала часу з дорожніми картами та задачами.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div style={{ minWidth: chartWidth + colNameW + colWhoW }}>
              <div className="flex border-b-2 border-border bg-card sticky top-0 z-[2]">
                <div className="relative px-2.5 py-2 font-bold text-[11px] text-foreground" style={{ width: colNameW, minWidth: 120 }}>
                  Ціль / Задача
                  <ColResizeHandle onDelta={(d) => setColNameW((w) => Math.max(120, w + d))} />
                </div>
                <div className="relative pl-0 pr-1 py-2 font-bold text-[11px] text-foreground" style={{ width: colWhoW, minWidth: 60 }}>
                  Хто
                  <ColResizeHandle onDelta={(d) => setColWhoW((w) => Math.max(60, w + d))} />
                </div>
                <div className="flex-1 flex relative">
                  {ganttMonths.map((m, i) => {
                    const w = m.days * pxPerDay;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "relative text-center py-2 font-semibold text-[10px] text-muted-foreground border-l border-border overflow-visible",
                          i % 2 ? "bg-muted/30" : "bg-transparent",
                        )}
                        style={{ width: w, minWidth: w }}
                      >
                        {w > 30 ? `${m.label} ${m.year}` : w > 18 ? m.label : ""}
                        <ColResizeHandle
                          onDelta={(delta) => {
                            // Scale total chart width proportionally to the drag on this column
                            const scale = (w + delta) / Math.max(w, 1);
                            setChartWidth((prev) => Math.max(MIN_CHART_W, Math.min(MAX_CHART_W, Math.round(prev * scale))));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {filteredGoals.map((g) => {
                const gac = getAccentDef(g.color);
                const gOpen = ganttExpanded[g.id];
                const doneTasks = g.tasks.filter((t) => t.status === "Done").length;
                const pct = g.tasks.length ? Math.round((doneTasks / g.tasks.length) * 100) : 0;
                const gBar = barPos(g.startDate, g.endDate);

                return (
                  <div key={g.id}>
                    <div
                      className={cn("flex items-center h-[34px] border-b border-border cursor-pointer", gac.bgLight)}
                      onClick={() => onToggleGoal(g.id)}
                    >
                      <div className="px-2.5 flex items-center gap-1.5 overflow-hidden" style={{ width: colNameW, minWidth: 120 }}>
                        <span className={cn("text-[11px] font-bold transition-transform", gOpen && "rotate-90")}>▶</span>
                        <span className={cn("w-2 h-2 rounded-full shrink-0", gac.bg)} />
                        <span className="text-xs font-bold truncate">{g.title || "—"}</span>
                      </div>
                      <div className={cn("text-[10px] font-semibold pl-0 pr-1 truncate", gac.text)} style={{ width: colWhoW, minWidth: 60 }}>
                        {teamName(g.team_id)}
                      </div>
                      <div className="flex-1 relative h-[26px]" onClick={(e) => e.stopPropagation()}>
                        <MonthBg ganttMonths={ganttMonths} pxPerDay={pxPerDay} />
                        <GoalBar
                          goal={g}
                          barLeft={gBar.left}
                          barWidth={gBar.width}
                          pxPerDay={pxPerDay}
                          ganttStart={ganttRange.start}
                          pct={pct}
                          colorBg={gac.bg}
                          onDragCommit={(s, e) => onChangeGoalDateRange(g.id, s, e)}
                          onChangeStart={(v) => onChangeGoalDates(g.id, "startDate", v)}
                          onChangeEnd={(v) => onChangeGoalDates(g.id, "endDate", v)}
                        />
                      </div>
                    </div>

                    {gOpen &&
                      g.tasks.map((t) => {
                        const tac = getAccentDef(t.color ?? g.color);
                        const tBar = barPos(t.startDate, t.endDate);
                        const isDone = t.status === "Done";
                        return (
                          <div
                            key={t.id}
                            className={cn("flex items-center min-h-7 py-0.5 border-b border-border/50", isDone ? "bg-success/5" : "bg-card")}
                          >
                            <div className="pl-8 pr-2.5 flex items-center gap-1 overflow-hidden" style={{ width: colNameW, minWidth: 120 }}>
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", tac.bg)} />
                              <span
                                className={cn("text-[11px] truncate", isDone ? "text-muted-foreground line-through" : "text-foreground")}
                                title={t.desc || t.title}
                              >
                                {t.title}
                              </span>
                              {t.links.length > 0 && (
                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <LinkIcon className="size-2.5" />{t.links.length}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] pl-0 pr-1 truncate text-muted-foreground" style={{ width: colWhoW, minWidth: 60 }}>
                              {userName(t.user_id) || "—"}
                            </div>
                            <div className="flex-1 relative h-5">
                              <MonthBg ganttMonths={ganttMonths} pxPerDay={pxPerDay} />
                              <TaskBar
                                task={t}
                                goalStartDate={g.startDate}
                                goalEndDate={g.endDate}
                                barLeft={tBar.left}
                                barWidth={tBar.width}
                                pxPerDay={pxPerDay}
                                ganttStart={ganttRange.start}
                                colorBg={tac.bg}
                                isDone={isDone}
                                onDragCommit={(s, e) => onChangeTaskDateRange(g.id, t.id, s, e)}
                                onChangeStart={(v) => onChangeTaskDates(g.id, t.id, "startDate", v)}
                                onChangeEnd={(v) => onChangeTaskDates(g.id, t.id, "endDate", v)}
                              />
                            </div>
                          </div>
                        );
                      })}

                    {gOpen && g.tasks.length === 0 && (
                      <div className="py-1.5 pl-8 text-[11px] text-muted-foreground border-b border-border/50">
                        Немає задач
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex gap-5 px-2.5 py-3.5 flex-wrap">
                {filteredGoals.map((g) => {
                  const lac = getAccentDef(g.color);
                  return (
                    <div key={g.id} className="flex items-center gap-1 text-[11px] text-foreground">
                      <span className={cn("w-3.5 h-2.5 rounded-sm inline-block", lac.bg)} />
                      <span className="font-semibold truncate max-w-[120px]">{g.title || teamName(g.team_id)}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-1 text-[11px] text-foreground">
                  <span className="w-3.5 h-2.5 rounded-sm inline-block bg-muted-foreground" />
                  <span className="font-semibold">Done</span>
                </div>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  ↔ Перетягуйте бари · 📅 Клік = редагувати дати
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
