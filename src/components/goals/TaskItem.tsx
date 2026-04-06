import { cn } from "@/lib/utils";
import { DateRangePicker, LinksEditor } from "../ui";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  FieldGroup,
  Field,
  FieldContent,
  FieldSeparator,
} from "../ui/field";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
} from "../ui/item";
import { getAccentDef } from "../../constants";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { TSTAT } from "../../constants";
import {
  ChevronRight,
  X,
  FileText,
  Link as LinkIcon,
  User,
  UserX,
  CircleDot,
  ChevronDown,
} from "lucide-react";
import type { Task, Goal, UserProfile } from "../../types";

interface TaskItemProps {
  task: Task;
  goal: Goal;
  teamUsers: UserProfile[];
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (fn: (t: Task) => Task) => void;
  onRemove: () => void;
  onAddLink: () => void;
  onRemoveLink: (lid: string) => void;
  onUpdateLink: (lid: string, lk: Task["links"][0]) => void;
}

const TSTAT_STYLES: Record<string, string> = {
  "To Do": "bg-muted text-muted-foreground",
  "In Progress": "bg-sky-500/10 text-sky-600",
  Done: "bg-success/10 text-success",
};

export function TaskItem({
  task: t,
  goal: g,
  teamUsers,
  isOpen,
  onToggle,
  onUpdate,
  onRemove,
  onAddLink,
  onRemoveLink,
  onUpdateLink,
}: TaskItemProps) {
  const confirm = useConfirmAction();
  const ac = getAccentDef(t.color ?? g.color);

  return (
    <div
      className={cn(
        "mb-1.5 rounded-md border border-border overflow-hidden",
        t.status === "Done" ? "bg-success/5" : "bg-card",
      )}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer flex-wrap"
        onClick={onToggle}
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 transition-transform text-muted-foreground",
            isOpen && "rotate-90",
          )}
        />

        <Field className="flex-1 min-w-[100px]" onClick={(e) => e.stopPropagation()}>
          <Input
            value={t.title}
            onChange={(e) =>
              onUpdate((tt) => ({ ...tt, title: e.target.value }))
            }
            placeholder="Назва задачі"
            className={cn(
              "h-auto border-none bg-transparent shadow-none px-0 py-0 text-xs font-semibold",
              "focus-visible:ring-0 focus-visible:border-none",
              t.status === "Done" && "line-through text-muted-foreground",
            )}
          />
        </Field>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  "cursor-pointer outline-none transition-colors hover:opacity-80",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  t.user_id ? ac.bgLight : "bg-muted",
                  t.user_id ? ac.text : "text-muted-foreground",
                )}
              >
                {t.user_id ? <User className="size-2.5" /> : <UserX className="size-2.5" />}
                {(() => {
                  if (!t.user_id) return "Не призначено";
                  const u = teamUsers.find((u) => u.id === t.user_id);
                  return u ? `${u.first_name} ${u.last_name}` : "Не призначено";
                })()}
                <ChevronDown className="size-2.5 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              <DropdownMenuLabel>Виконавець</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className={cn(!t.user_id && "bg-accent font-semibold")}
                  onSelect={() =>
                    onUpdate((tt) => ({ ...tt, user_id: null }))
                  }
                >
                  <UserX className="size-3 mr-1.5 text-muted-foreground" />
                  Не призначено
                </DropdownMenuItem>
                {teamUsers.length === 0 ? (
                  <DropdownMenuItem disabled className="text-[11px] text-muted-foreground italic">
                    {g.team_id ? "Немає користувачів у команді" : "Спочатку оберіть команду для цілі"}
                  </DropdownMenuItem>
                ) : (
                  teamUsers.map((u) => (
                    <DropdownMenuItem
                      key={u.id}
                      className={cn(
                        t.user_id === u.id && "bg-accent font-semibold",
                      )}
                      onSelect={() =>
                        onUpdate((tt) => ({ ...tt, user_id: u.id }))
                      }
                    >
                      <User className="size-3 mr-1.5" />
                      {u.first_name} {u.last_name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DateRangePicker
            startDate={t.startDate}
            endDate={t.endDate}
            onChangeStart={(v) =>
              onUpdate((tt) => ({ ...tt, startDate: v }))
            }
            onChangeEnd={(v) =>
              onUpdate((tt) => ({ ...tt, endDate: v }))
            }
            minDate={g.startDate}
            maxDate={g.endDate}
            size="sm"
          />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  "cursor-pointer outline-none transition-colors hover:opacity-80",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  TSTAT_STYLES[t.status] ?? "bg-muted text-muted-foreground",
                )}
              >
                <CircleDot className="size-2.5" />
                {t.status}
                <ChevronDown className="size-2.5 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[130px]">
              <DropdownMenuLabel>Статус</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {TSTAT.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    className={cn(
                      t.status === s && "bg-accent font-semibold",
                    )}
                    onSelect={() =>
                      onUpdate((tt) => ({
                        ...tt,
                        status: s as Task["status"],
                      }))
                    }
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        TSTAT_STYLES[s]?.includes("text-")
                          ? TSTAT_STYLES[s]
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
              className="size-6 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                confirm(
                  `Видалити задачу «${t.title || "без назви"}»?`,
                  onRemove,
                );
              }}
            >
              <X className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Видалити задачу</TooltipContent>
        </Tooltip>
      </div>

      {isOpen && (
        <div className="border-t border-border pl-8">
          <FieldGroup className="space-y-0">
            <Item size="sm" variant="default" className="items-start">
              <ItemMedia variant="icon" className="mt-0.5 size-7 [&_svg]:size-3.5">
                <FileText />
              </ItemMedia>
              <ItemContent className="gap-1.5">
                <ItemTitle className="text-[11px] text-muted-foreground font-semibold">
                  Опис
                </ItemTitle>
                <Field>
                  <FieldContent>
                    <Textarea
                      value={t.desc}
                      onChange={(e) =>
                        onUpdate((tt) => ({ ...tt, desc: e.target.value }))
                      }
                      placeholder="Додайте опис задачі…"
                      className="min-h-[60px] border-input bg-transparent px-2.5 py-1.5 text-xs leading-relaxed resize-y"
                    />
                  </FieldContent>
                </Field>
              </ItemContent>
            </Item>

            <FieldSeparator className="mx-3" />

            <Item size="sm" variant="default" className="items-start pb-3">
              <ItemMedia variant="icon" className="mt-0.5 size-7 [&_svg]:size-3.5">
                <LinkIcon />
              </ItemMedia>
              <ItemContent className="gap-1">
                <Field>
                  <FieldContent>
                    <LinksEditor
                      links={t.links}
                      onAdd={onAddLink}
                      onRemove={onRemoveLink}
                      onUpdate={onUpdateLink}
                    />
                  </FieldContent>
                </Field>
              </ItemContent>
            </Item>
          </FieldGroup>
        </div>
      )}
    </div>
  );
}
