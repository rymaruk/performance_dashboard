import clsx from "clsx";
import { Editable, EditableArea, DateRangePicker, LinksEditor } from "../ui";
import { roleColor } from "../../utils/roleColor";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { TSTAT, TASK_ROLES } from "../../constants";
import type { Task, Goal } from "../../types";

interface TaskItemProps {
  task: Task;
  goal: Goal;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (fn: (t: Task) => Task) => void;
  onRemove: () => void;
  onAddLink: () => void;
  onRemoveLink: (lid: string) => void;
  onUpdateLink: (lid: string, lk: Task["links"][0]) => void;
}

export function TaskItem({
  task: t,
  goal: g,
  isOpen,
  onToggle,
  onUpdate,
  onRemove,
  onAddLink,
  onRemoveLink,
  onUpdateLink,
}: TaskItemProps) {
  const confirm = useConfirmAction();
  const rc = roleColor(t.assignee);

  const statusCls =
    t.status === "Done"
      ? "bg-green-100 text-green-900"
      : t.status === "In Progress"
        ? "bg-primary-100 text-primary-900"
        : "bg-gray-200 text-gray-700";

  return (
    <div className={clsx("mb-1.5 border border-gray-200 rounded-md overflow-hidden", t.status === "Done" ? "bg-green-50" : "bg-white")}>
      <div className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer flex-wrap" onClick={onToggle}>
        <span className={clsx("text-[11px] transition-transform", isOpen && "rotate-90")}>▶</span>

        <div className="flex-1 min-w-[100px]">
          <Editable
            value={t.title}
            onChange={(v) => onUpdate((tt) => ({ ...tt, title: String(v) }))}
            className={clsx("font-semibold text-xs", t.status === "Done" && "line-through")}
            placeholder="Назва"
          />
        </div>

        <Editable
          value={t.assignee}
          onChange={(v) => onUpdate((tt) => ({ ...tt, assignee: v as Task["assignee"] }))}
          options={[...TASK_ROLES]}
          className={clsx("text-[10px] font-semibold px-2 py-px rounded-full", rc.bg50, rc.text700)}
        />

        <DateRangePicker
          startDate={t.startDate}
          endDate={t.endDate}
          onChangeStart={(v) => onUpdate((tt) => ({ ...tt, startDate: v }))}
          onChangeEnd={(v) => onUpdate((tt) => ({ ...tt, endDate: v }))}
          minDate={g.startDate}
          maxDate={g.endDate}
          size="sm"
        />

        <Editable
          value={t.status}
          onChange={(v) => onUpdate((tt) => ({ ...tt, status: v as Task["status"] }))}
          options={[...TSTAT]}
          className={clsx("text-[10px] px-2 py-px rounded-full font-semibold", statusCls)}
        />

        <button
          onClick={(e) => { e.stopPropagation(); confirm(`Видалити задачу «${t.title || "без назви"}»?`, onRemove); }}
          className="bg-transparent border-none cursor-pointer text-red-500 text-[13px] px-1.5 py-0.5 leading-none hover:text-red-700"
          title="Видалити задачу"
        >
          ✕
        </button>
      </div>

      {isOpen && (
        <div className="px-2.5 pb-2.5 pl-7 border-t border-gray-200">
          <div className="mt-2">
            <div className="text-[11px] font-semibold text-gray-600 mb-0.5">📝 Опис</div>
            <EditableArea value={t.desc} onChange={(v) => onUpdate((tt) => ({ ...tt, desc: v }))} />
          </div>
          <LinksEditor links={t.links} onAdd={onAddLink} onRemove={onRemoveLink} onUpdate={onUpdateLink} />
        </div>
      )}
    </div>
  );
}
