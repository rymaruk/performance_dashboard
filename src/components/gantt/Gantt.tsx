import clsx from "clsx";
import { roleColor } from "../../utils/roleColor";
import { DateRangePicker } from "../ui";
import { GANTT_PX } from "../../constants";
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
            className={clsx("absolute top-0 bottom-0 border-l border-gray-200", i % 2 ? "bg-black/[0.015]" : "bg-transparent")}
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
      <div className="bg-white rounded-lg m-4 p-5 shadow-sm overflow-x-auto">
        <div className="text-[15px] font-bold mb-1">📅 Діаграма Ганта</div>
        <div className="text-[11px] text-gray-500 mb-4">
          Клік на ціль — розгорнути задачі. Клік на дати — змінити діапазон.
        </div>

        {proj.goals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Немає даних</div>
        ) : (
          <div style={{ minWidth: GANTT_PX + 340 }}>
            {/* Header */}
            <div className="flex border-b-2 border-gray-300 bg-white sticky top-0 z-[2]">
              <div className="w-[260px] min-w-[260px] px-2.5 py-2 font-bold text-[11px] text-gray-700">
                Ціль / Задача
              </div>
              <div className="w-[80px] min-w-[80px] px-1 py-2 font-bold text-[11px] text-gray-700">
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
                        className={clsx(
                          "text-center py-2 font-semibold text-[10px] text-gray-600 border-l border-gray-200 overflow-hidden",
                          i % 2 ? "bg-gray-50" : "bg-transparent",
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

            {/* Goals + Tasks */}
            {proj.goals.map((g) => {
              const rc = roleColor(g.owner);
              const gOpen = ganttExpanded[g.id];
              const doneTasks = g.tasks.filter((t) => t.status === "Done").length;
              const pct = g.tasks.length ? Math.round((doneTasks / g.tasks.length) * 100) : 0;
              const gBar = barPos(g.startDate, g.endDate);

              return (
                <div key={g.id}>
                  {/* Goal row */}
                  <div
                    className={clsx("flex items-center h-[34px] border-b border-gray-200 cursor-pointer", rc.bg50)}
                    onClick={() => onToggleGoal(g.id)}
                  >
                    <div className="w-[260px] min-w-[260px] px-2.5 flex items-center gap-1.5 overflow-hidden">
                      <span className={clsx("text-[11px] font-bold transition-transform", gOpen && "rotate-90")}>▶</span>
                      <span className={clsx("w-2 h-2 rounded-full shrink-0", rc.bg700)} />
                      <span className="text-xs font-bold truncate">{g.title || "—"}</span>
                    </div>
                    <div className={clsx("w-[80px] min-w-[80px] text-[10px] font-semibold px-1", rc.text700)}>
                      {g.owner}
                    </div>
                    <div className="flex-1 relative h-[26px]">
                      <MonthBg ganttMonths={ganttMonths} pxPerDay={pxPerDay} />
                      <div
                        className="absolute top-1 h-[18px] rounded flex items-center justify-between px-1 shadow-sm overflow-visible"
                        style={{ left: gBar.left, width: gBar.width, background: rc.gradient }}
                      >
                        <DateRangePicker
                          startDate={g.startDate}
                          endDate={g.endDate}
                          onChangeStart={(v) => onChangeGoalDates(g.id, "startDate", v)}
                          onChangeEnd={(v) => onChangeGoalDates(g.id, "endDate", v)}
                          size="sm"
                          variant="gantt"
                        />
                        <span className="text-[9px] text-white/80 font-semibold shrink-0">{pct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Task rows */}
                  {gOpen &&
                    g.tasks.map((t) => {
                      const trc = roleColor(t.assignee);
                      const tBar = barPos(t.startDate, t.endDate);
                      const isDone = t.status === "Done";
                      return (
                        <div
                          key={t.id}
                          className={clsx("flex items-center h-7 border-b border-gray-100", isDone ? "bg-[#f9fdf9]" : "bg-white")}
                        >
                          <div className="w-[260px] min-w-[260px] pl-8 pr-2.5 flex items-center gap-1 overflow-hidden">
                            <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", trc.bg500)} />
                            <span
                              className={clsx("text-[11px] truncate", isDone ? "text-gray-400 line-through" : "text-gray-800")}
                              title={t.desc || t.title}
                            >
                              {t.title}
                            </span>
                            {t.links.length > 0 && (
                              <span className="text-[9px] text-primary-500">🔗{t.links.length}</span>
                            )}
                          </div>
                          <div className={clsx("w-[80px] min-w-[80px] text-[10px] font-semibold px-1", trc.text700)}>
                            {t.assignee}
                          </div>
                          <div className="flex-1 relative h-5">
                            <MonthBg ganttMonths={ganttMonths} pxPerDay={pxPerDay} />
                            <div
                              className={clsx("absolute top-1 h-3 rounded-sm opacity-80 flex items-center justify-center overflow-visible", isDone ? "bg-gray-400" : trc.bg500)}
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
                    <div className="py-1.5 pl-8 text-[11px] text-gray-400 border-b border-gray-100">
                      Немає задач
                    </div>
                  )}
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex gap-5 px-2.5 py-3.5 flex-wrap">
              {[
                { l: "SMM", cls: "bg-primary-500" },
                { l: "SEO", cls: "bg-green-500" },
                { l: "Media Buyer", cls: "bg-orange-500" },
                { l: "Команда", cls: "bg-purple-500" },
                { l: "Done", cls: "bg-gray-400" },
              ].map((x) => (
                <div key={x.l} className="flex items-center gap-1 text-[11px] text-gray-700">
                  <span className={clsx("w-3.5 h-2.5 rounded-sm inline-block", x.cls)} />
                  <span className="font-semibold">{x.l}</span>
                </div>
              ))}
              <span className="text-[10px] text-gray-400 ml-auto">
                ▶ Клік = задачі · 📅 Клік на дати = редагувати
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
