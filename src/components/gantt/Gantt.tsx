import { cn } from "@/lib/utils";
import { getAccentDef } from "../../constants";
import { DateRangePicker } from "../ui";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { GANTT_PX } from "../../constants";
import { Calendar, Link as LinkIcon } from "lucide-react";
import type { GanttMonth, GanttRange, Project } from "../../types";

interface GanttProps {
  proj: Project;
  ganttRange: GanttRange;
  ganttMonths: GanttMonth[];
  ganttExpanded: Record<string, boolean>;
  onToggleGoal: (id: string) => void;
  onChangeGoalDates: (gid: string, field: "startDate" | "endDate", val: string) => void;
  onChangeTaskDates: (gid: string, tid: string, field: "startDate" | "endDate", val: string) => void;
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

export function Gantt({
  proj,
  ganttRange,
  ganttMonths,
  ganttExpanded,
  onToggleGoal,
  onChangeGoalDates,
  onChangeTaskDates,
}: GanttProps) {
  const pxPerDay = GANTT_PX / Math.max(ganttRange.totalDays, 1);

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
          <div className="text-[11px] text-muted-foreground">
            Клік на ціль — розгорнути задачі. Клік на дати — змінити діапазон.
          </div>
        </CardHeader>
        <CardContent>
          {proj.goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Немає даних</div>
          ) : (
            <div style={{ minWidth: GANTT_PX + 340 }}>
              <div className="flex border-b-2 border-border bg-card sticky top-0 z-[2]">
                <div className="w-[260px] min-w-[260px] px-2.5 py-2 font-bold text-[11px] text-foreground">
                  Ціль / Задача
                </div>
                <div className="w-[80px] min-w-[80px] px-1 py-2 font-bold text-[11px] text-foreground">
                  Хто
                </div>
                <div className="flex-1 flex relative">
                  {(() => {
                    let acc = 0;
                    return ganttMonths.map((m, i) => {
                      const w = m.days * pxPerDay;
                      const el = (
                        <div
                          key={i}
                          className={cn(
                            "text-center py-2 font-semibold text-[10px] text-muted-foreground border-l border-border overflow-hidden",
                            i % 2 ? "bg-muted/30" : "bg-transparent",
                          )}
                          style={{ width: w, minWidth: w }}
                        >
                          {w > 30 ? `${m.label} ${m.year}` : w > 18 ? m.label : ""}
                        </div>
                      );
                      acc += w;
                      return el;
                    });
                  })()}
                </div>
              </div>

              {proj.goals.map((g) => {
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
                      <div className="w-[260px] min-w-[260px] px-2.5 flex items-center gap-1.5 overflow-hidden">
                        <span className={cn("text-[11px] font-bold transition-transform", gOpen && "rotate-90")}>▶</span>
                        <span className={cn("w-2 h-2 rounded-full shrink-0", gac.bg)} />
                        <span className="text-xs font-bold truncate">{g.title || "—"}</span>
                      </div>
                      <div className={cn("w-[80px] min-w-[80px] text-[10px] font-semibold px-1", gac.text)}>
                        {g.owner}
                      </div>
                      <div className="flex-1 relative h-[26px]">
                        <MonthBg ganttMonths={ganttMonths} pxPerDay={pxPerDay} />
                        <div
                          className={cn("absolute top-1 h-[18px] rounded flex items-center justify-between px-1 shadow-sm overflow-visible", gac.bg)}
                          style={{ left: gBar.left, width: gBar.width }}
                        >
                          <DateRangePicker
                            startDate={g.startDate}
                            endDate={g.endDate}
                            onChangeStart={(v) => onChangeGoalDates(g.id, "startDate", v)}
                            onChangeEnd={(v) => onChangeGoalDates(g.id, "endDate", v)}
                            size="sm"
                            variant="gantt"
                          />
                          <span className="text-[9px] text-primary-foreground/80 font-semibold shrink-0">{pct}%</span>
                        </div>
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
                            className={cn("flex items-center h-7 border-b border-border/50", isDone ? "bg-success/5" : "bg-card")}
                          >
                            <div className="w-[260px] min-w-[260px] pl-8 pr-2.5 flex items-center gap-1 overflow-hidden">
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
                            <div className={cn("w-[80px] min-w-[80px] text-[10px] font-semibold px-1", tac.text)}>
                              {t.assignee}
                            </div>
                            <div className="flex-1 relative h-5">
                              <MonthBg ganttMonths={ganttMonths} pxPerDay={pxPerDay} />
                              <div
                                className={cn("absolute top-1 h-3 rounded-sm opacity-80 flex items-center justify-center overflow-visible", isDone ? "bg-muted-foreground" : tac.bg)}
                                style={{ left: tBar.left, width: tBar.width }}
                              >
                                {tBar.width > 50 && (
                                  <DateRangePicker
                                    startDate={t.startDate}
                                    endDate={t.endDate}
                                    onChangeStart={(v) => onChangeTaskDates(g.id, t.id, "startDate", v)}
                                    onChangeEnd={(v) => onChangeTaskDates(g.id, t.id, "endDate", v)}
                                    minDate={g.startDate}
                                    maxDate={g.endDate}
                                    size="sm"
                                    variant="gantt"
                                  />
                                )}
                              </div>
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
                {proj.goals.map((g) => {
                  const lac = getAccentDef(g.color);
                  return (
                    <div key={g.id} className="flex items-center gap-1 text-[11px] text-foreground">
                      <span className={cn("w-3.5 h-2.5 rounded-sm inline-block", lac.bg)} />
                      <span className="font-semibold truncate max-w-[120px]">{g.title || g.owner}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-1 text-[11px] text-foreground">
                  <span className="w-3.5 h-2.5 rounded-sm inline-block bg-muted-foreground" />
                  <span className="font-semibold">Done</span>
                </div>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  ▶ Клік = задачі · 📅 Клік на дати = редагувати
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
