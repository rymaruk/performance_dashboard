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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ColorPicker } from "../ui/color-picker";
import { KPITable } from "./KPITable";
import { TaskItem } from "./TaskItem";
import { getAccentDef } from "../../constants";
import { medDate } from "../../utils/date";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { PRIO, STAT } from "../../constants";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "../ui/item";
import {
  Plus,
  X,
  Users,
  Flag,
  CircleDot,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import type { Goal, KPI, KpiDefinition, Task, Team, UserProfile } from "../../types";
import type { AccentColor } from "../../constants";

interface GoalItemProps {
  goal: Goal;
  kpiDefinitions: KpiDefinition[];
  teams: Team[];
  isAdmin: boolean;
  teamUsers: UserProfile[];
  expandedTasks: Record<string, boolean>;
  filteredTaskIds?: Set<string> | null;
  onRemove: () => void;
  onUpdateField: (field: keyof Goal, value: unknown) => void;
  onChangeDates: (field: "startDate" | "endDate", val: string) => void;
  onAddKPI: (kpiDefId: string) => void;
  onRemoveKPI: (kid: string) => void;
  onUpdateKPI: (kid: string, fn: (k: KPI) => KPI, comment?: string) => void;
  onAddTask: () => void;
  onRemoveTask: (tid: string) => void;
  onUpdateTask: (tid: string, fn: (t: Task) => Task) => void;
  onToggleTask: (tid: string) => void;
  onAddLink: (tid: string) => void;
  onRemoveLink: (tid: string, lid: string) => void;
  onUpdateLink: (tid: string, lid: string, lk: Task["links"][0]) => void;
  kpiHistoryRevision?: number;
}

const STATUS_STYLES: Record<string, string> = {
  "Планується": "bg-muted text-muted-foreground",
  "В процесі": "bg-sky-500/10 text-sky-600",
  "На ревʼю": "bg-amber-500/10 text-amber-600",
  "Завершено": "bg-success/10 text-success",
  "Заблоковано": "bg-destructive/10 text-destructive",
};

const PRIO_STYLES: Record<string, string> = {
  "🔴 Критичний": "text-rose-600",
  "🟠 Високий": "text-orange-600",
  "🟡 Середній": "text-amber-600",
  "🟢 Низький": "text-emerald-600",
};

export function GoalItem({
  goal: g,
  kpiDefinitions,
  teams,
  isAdmin,
  teamUsers,
  expandedTasks,
  filteredTaskIds,
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
  kpiHistoryRevision,
}: GoalItemProps) {
  const confirm = useConfirmAction();
  const ac = getAccentDef(g.color);

  return (
    <AccordionItem
      value={g.id}
      className={cn(
        "bg-card rounded-lg mt-2 shadow-sm border-l-4 border overflow-hidden",
        ac.border,
      )}
    >
      <AccordionTrigger
        className={cn(
          "px-4 py-3 flex flex-wrap gap-2 items-center hover:no-underline cursor-pointer",
          "text-left w-full [&>svg]:shrink-0",
          ac.bgLight,
        )}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <ColorPicker
            value={g.color}
            onChange={(c: AccentColor) => onUpdateField("color", c)}
            size="sm"
          />
        </div>

        <div className="flex-1 min-w-[160px] min-h-8 flex items-center">
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
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    "cursor-pointer outline-none transition-colors hover:opacity-80",
                    "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    g.team_id ? ac.bgLight : "bg-muted",
                    g.team_id ? ac.text : "text-muted-foreground",
                  )}
                >
                  <Users className="size-3" />
                  {teams.find((t) => t.id === g.team_id)?.name ?? "Без команди"}
                  <ChevronDown className="size-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                <DropdownMenuLabel>Команда</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className={cn(!g.team_id && "bg-accent font-semibold")}
                    onSelect={() => {
                      if (!g.team_id) return;
                      const hasAssigned = g.tasks.some((t) => t.user_id);
                      if (hasAssigned) {
                        confirm(
                          "Зміна команди зніме призначених користувачів з усіх задач. Продовжити?",
                          () => onUpdateField("team_id", null),
                        );
                      } else {
                        onUpdateField("team_id", null);
                      }
                    }}
                  >
                    Без команди
                  </DropdownMenuItem>
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      className={cn(
                        g.team_id === team.id && "bg-accent font-semibold",
                      )}
                      onSelect={() => {
                        if (team.id === g.team_id) return;
                        const hasAssigned = g.tasks.some((t) => t.user_id);
                        if (hasAssigned) {
                          confirm(
                            "Зміна команди зніме призначених користувачів з усіх задач. Продовжити?",
                            () => onUpdateField("team_id", team.id),
                          );
                        } else {
                          onUpdateField("team_id", team.id);
                        }
                      }}
                    >
                      {team.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                "cursor-default select-none",
                g.team_id ? ac.bgLight : "bg-muted",
                g.team_id ? ac.text : "text-muted-foreground",
              )}
            >
              <Users className="size-3" />
              {teams.find((t) => t.id === g.team_id)?.name ?? "Без команди"}
            </div>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  "cursor-pointer outline-none transition-colors hover:opacity-80",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "bg-muted",
                  PRIO_STYLES[g.priority] ?? "text-muted-foreground",
                )}
              >
                <Flag className="size-3" />
                {g.priority}
                <ChevronDown className="size-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              <DropdownMenuLabel>Пріоритет</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {PRIO.map((p) => (
                  <DropdownMenuItem
                    key={p}
                    className={cn(
                      PRIO_STYLES[p],
                      g.priority === p && "bg-accent font-semibold",
                    )}
                    onSelect={() => onUpdateField("priority", p)}
                  >
                    {p}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  "cursor-pointer outline-none transition-colors hover:opacity-80",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  STATUS_STYLES[g.status] ?? "bg-muted text-muted-foreground",
                )}
              >
                <CircleDot className="size-3" />
                {g.status}
                <ChevronDown className="size-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              <DropdownMenuLabel>Статус</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {STAT.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    className={cn(
                      g.status === s && "bg-accent font-semibold",
                    )}
                    onSelect={() => onUpdateField("status", s)}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        STATUS_STYLES[s]?.includes("text-")
                          ? STATUS_STYLES[s]
                              .split(" ")
                              .find((c) => c.startsWith("text-"))
                              ?.replace("text-", "bg-")
                          : "bg-muted-foreground",
                      )}
                    />
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                confirm(
                  `Видалити ціль «${g.title || "без назви"}»?`,
                  onRemove,
                );
              }}
            >
              <X className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Видалити ціль</TooltipContent>
        </Tooltip>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4">
        <KPITable
          goalId={g.id}
          goalColor={g.color}
          kpis={g.kpis}
          kpiDefinitions={kpiDefinitions}
          onAdd={onAddKPI}
          onRemove={onRemoveKPI}
          onUpdate={onUpdateKPI}
          kpiHistoryRevision={kpiHistoryRevision}
        />

        <div>
          <Item size="sm" className="mb-2">
            <ItemMedia variant="icon">
              <ClipboardList />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Задачі</ItemTitle>
              <ItemDescription>
                {medDate(g.startDate)} – {medDate(g.endDate)}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button onClick={onAddTask} size="sm" variant="outline">
                <Plus className="size-3" /> Задача
              </Button>
            </ItemActions>
          </Item>

          {g.tasks
            .filter((t) => !filteredTaskIds || filteredTaskIds.has(t.id))
            .map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              goal={g}
              teamUsers={teamUsers}
              isAdmin={isAdmin}
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
