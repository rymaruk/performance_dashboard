import { cn } from "@/lib/utils";
import { Editable, EditableArea, DateRangePicker, LinksEditor } from "../ui";
import { Button } from "../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { roleColor } from "../../utils/roleColor";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { TSTAT, TASK_ROLES } from "../../constants";
import { ChevronRight, X, FileText } from "lucide-react";
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

  return (
    <div className={cn("mb-1.5 border border-border rounded-md overflow-hidden", t.status === "Done" ? "bg-success/5" : "bg-card")}>
      <div className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer flex-wrap" onClick={onToggle}>
        <ChevronRight className={cn("size-3.5 transition-transform text-muted-foreground", isOpen && "rotate-90")} />

        <div className="flex-1 min-w-[100px]">
          <Editable
            value={t.title}
            onChange={(v) => onUpdate((tt) => ({ ...tt, title: String(v) }))}
            className={cn("font-semibold text-xs", t.status === "Done" && "line-through")}
            placeholder="Назва"
          />
        </div>

        <Editable
          value={t.assignee}
          onChange={(v) => onUpdate((tt) => ({ ...tt, assignee: v as Task["assignee"] }))}
          options={[...TASK_ROLES]}
          className={cn("text-[10px] font-semibold px-2 py-px rounded-full", rc.bgLight, rc.text)}
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
          className={cn("text-[10px] px-2 py-px rounded-full font-semibold")}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); confirm(`Видалити задачу «${t.title || "без назви"}»?`, onRemove); }}
            >
              <X className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Видалити задачу</TooltipContent>
        </Tooltip>
      </div>

      {isOpen && (
        <div className="px-2.5 pb-2.5 pl-7 border-t border-border">
          <div className="mt-2">
            <div className="text-[11px] font-semibold text-muted-foreground mb-0.5 flex items-center gap-1">
              <FileText className="size-3" /> Опис
            </div>
            <EditableArea value={t.desc} onChange={(v) => onUpdate((tt) => ({ ...tt, desc: v }))} />
          </div>
          <LinksEditor links={t.links} onAdd={onAddLink} onRemove={onRemoveLink} onUpdate={onUpdateLink} />
        </div>
      )}
    </div>
  );
}
