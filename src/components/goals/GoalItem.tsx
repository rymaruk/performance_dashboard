import clsx from "clsx";
import { Editable, DateRangePicker, Btn } from "../ui";
import { KPITable } from "./KPITable";
import { TaskItem } from "./TaskItem";
import { roleColor } from "../../utils/roleColor";
import { medDate } from "../../utils/date";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { ROLES, PRIO, STAT } from "../../constants";
import type { Goal, KPI, KpiDefinition, Task } from "../../types";

interface GoalItemProps {
  goal: Goal;
  kpiDefinitions: KpiDefinition[];
  isOpen: boolean;
  expandedTasks: Record<string, boolean>;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateField: (field: keyof Goal, value: unknown) => void;
  onChangeDates: (field: "startDate" | "endDate", val: string) => void;
  onAddKPI: (kpiDefId: string) => void;
  onRemoveKPI: (kid: string) => void;
  onUpdateKPI: (kid: string, fn: (k: KPI) => KPI) => void;
  onAddTask: () => void;
  onRemoveTask: (tid: string) => void;
  onUpdateTask: (tid: string, fn: (t: Task) => Task) => void;
  onToggleTask: (tid: string) => void;
  onAddLink: (tid: string) => void;
  onRemoveLink: (tid: string, lid: string) => void;
  onUpdateLink: (tid: string, lid: string, lk: Task["links"][0]) => void;
}

export function GoalItem({
  goal: g,
  kpiDefinitions,
  isOpen,
  expandedTasks,
  onToggle,
  onRemove,
  onUpdateField,
  onChangeDates,
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
}: GoalItemProps) {
  const confirm = useConfirmAction();
  const rc = roleColor(g.owner);

  return (
    <div className={clsx("bg-white rounded-lg mx-4 mt-4 shadow-sm border-l-4 overflow-hidden", `border-l-4`)}>
      {/* Goal header */}
      <div
        className={clsx("px-4 py-3 flex flex-wrap gap-2 items-center cursor-pointer", rc.bg50)}
        onClick={onToggle}
      >
        <span className={clsx("text-[13px] transition-transform", isOpen && "rotate-90")}>▶</span>

        <div className="flex-1 min-w-[160px]">
          <Editable
            value={g.title}
            onChange={(v) => onUpdateField("title", String(v))}
            className="font-bold text-sm"
            placeholder="Назва цілі"
            tag="div"
          />
        </div>

        <DateRangePicker
          startDate={g.startDate}
          endDate={g.endDate}
          onChangeStart={(v) => onChangeDates("startDate", v)}
          onChangeEnd={(v) => onChangeDates("endDate", v)}
        />

        <Editable
          value={g.owner}
          onChange={(v) => onUpdateField("owner", v)}
          options={[...ROLES]}
          className={clsx("text-[11px] px-2.5 py-0.5 rounded-full font-semibold", rc.bg100, rc.text700)}
        />
        <Editable
          value={g.priority}
          onChange={(v) => onUpdateField("priority", v)}
          options={[...PRIO]}
          className="text-[11px]"
        />
        <Editable
          value={g.status}
          onChange={(v) => onUpdateField("status", v)}
          options={[...STAT]}
          className={clsx(
            "text-[11px] px-2.5 py-0.5 rounded-full font-semibold",
            g.status === "Завершено" ? "bg-green-100 text-green-900" : "bg-gray-200 text-gray-700",
          )}
        />

        <button
          onClick={(e) => { e.stopPropagation(); confirm(`Видалити ціль «${g.title || "без назви"}»?`, onRemove); }}
          className="bg-transparent border-none cursor-pointer text-red-500 text-base px-1.5 py-0.5 leading-none hover:text-red-700"
          title="Видалити ціль"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="px-4 py-3 pb-4">
          <KPITable goalId={g.id} kpis={g.kpis} kpiDefinitions={kpiDefinitions} onAdd={onAddKPI} onRemove={onRemoveKPI} onUpdate={onUpdateKPI} />

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-gray-700">
                📋 Задачі{" "}
                <span className="font-normal text-gray-400 text-[11px]">
                  ({medDate(g.startDate)} – {medDate(g.endDate)})
                </span>
              </span>
              <Btn onClick={onAddTask} size="sm">＋ Задача</Btn>
            </div>

            {g.tasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                goal={g}
                isOpen={!!expandedTasks[t.id]}
                onToggle={() => onToggleTask(t.id)}
                onUpdate={(fn) => onUpdateTask(t.id, fn)}
                onRemove={() => onRemoveTask(t.id)}
                onAddLink={() => onAddLink(t.id)}
                onRemoveLink={(lid) => onRemoveLink(t.id, lid)}
                onUpdateLink={(lid, lk) => onUpdateLink(t.id, lid, lk)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
