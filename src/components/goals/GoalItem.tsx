import { cn } from "@/lib/utils";
import { Editable, DateRangePicker } from "../ui";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../ui/tooltip";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";
import { KPITable } from "./KPITable";
import { TaskItem } from "./TaskItem";
import { roleColor } from "../../utils/roleColor";
import { medDate } from "../../utils/date";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { ROLES, PRIO, STAT } from "../../constants";
import { Plus, X } from "lucide-react";
import type { Goal, KPI, KpiDefinition, Task } from "../../types";

interface GoalItemProps {
  goal: Goal;
  kpiDefinitions: KpiDefinition[];
  expandedTasks: Record<string, boolean>;
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
  expandedTasks,
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
    <AccordionItem
      value={g.id}
      className={cn(
        "bg-card rounded-lg mt-2 shadow-sm border-l-4 border overflow-hidden",
        rc.border,
      )}
    >
      <AccordionTrigger
        className={cn(
          "px-4 py-3 flex flex-wrap gap-2 items-center hover:no-underline",
          rc.bgLight,
        )}
      >
        <div className="flex-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
          <Editable
            value={g.title}
            onChange={(v) => onUpdateField("title", String(v))}
            className="font-bold text-sm"
            placeholder="Назва цілі"
            tag="div"
          />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DateRangePicker
            startDate={g.startDate}
            endDate={g.endDate}
            onChangeStart={(v) => onChangeDates("startDate", v)}
            onChangeEnd={(v) => onChangeDates("endDate", v)}
          />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <Editable
            value={g.owner}
            onChange={(v) => onUpdateField("owner", v)}
            options={[...ROLES]}
            className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-semibold", rc.bgLight, rc.text)}
          />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Editable
            value={g.priority}
            onChange={(v) => onUpdateField("priority", v)}
            options={[...PRIO]}
            className="text-[11px]"
          />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Editable
            value={g.status}
            onChange={(v) => onUpdateField("status", v)}
            options={[...STAT]}
            className={cn(
              "text-[11px] px-2.5 py-0.5 rounded-full font-semibold",
              g.status === "Завершено" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
            )}
          />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); confirm(`Видалити ціль «${g.title || "без назви"}»?`, onRemove); }}
            >
              <X className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Видалити ціль</TooltipContent>
        </Tooltip>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4">
        <KPITable goalId={g.id} kpis={g.kpis} kpiDefinitions={kpiDefinitions} onAdd={onAddKPI} onRemove={onRemoveKPI} onUpdate={onUpdateKPI} />

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              📋 Задачі
              <span className="font-normal text-muted-foreground text-[11px]">
                ({medDate(g.startDate)} – {medDate(g.endDate)})
              </span>
            </span>
            <Button onClick={onAddTask} size="sm" variant="outline">
              <Plus className="size-3" /> Задача
            </Button>
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
      </AccordionContent>
    </AccordionItem>
  );
}
