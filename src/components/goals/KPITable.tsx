import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { fmtNum } from "../../utils/format";
import { ProgressBar } from "../ui/progress-bar";
import { Button } from "../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "../ui/item";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { getAccentDef } from "../../constants";
import { KpiEditDialog } from "../kpi/KpiEditDialog";
import { KpiHistoryDialog } from "../kpi/KpiHistoryDialog";
import { KpiLastChange } from "../kpi/KpiLastChange";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { X, BarChart3, Plus, TrendingUp, TrendingDown, CircleDot, ChevronDown, CheckCircle2 } from "lucide-react";
import { KPI_STAT } from "../../constants";
import type { KPI, KpiDefinition, KpiValueHistory, KpiStatus } from "../../types";

const KPI_STATUS_STYLES: Record<KpiStatus, string> = {
  "В процесі": "bg-sky-500/10 text-sky-600",
  "Завершено": "bg-success/10 text-success",
};

interface KPITableProps {
  goalId: string;
  goalColor?: string | null;
  kpis: KPI[];
  kpiDefinitions: KpiDefinition[];
  /** When true, hides the section title row; use when the goal header is shown beside tasks (e.g. GoalItem two-column layout). */
  embedded?: boolean;
  onAdd: (kpiDefId: string) => void;
  onRemove: (kid: string) => void;
  onUpdate: (kid: string, fn: (k: KPI) => KPI, comment?: string) => void;
  onUpdateStatus: (kid: string, status: KpiStatus) => void;
  kpiLastChanges?: Record<string, KpiValueHistory>;
}

export function KPITable({
  goalColor,
  kpis,
  kpiDefinitions,
  embedded = false,
  onAdd,
  onRemove,
  onUpdate,
  onUpdateStatus,
  kpiLastChanges,
}: KPITableProps) {
  const confirm = useConfirmAction();

  const attachedDefIds = useMemo(
    () => new Set(kpis.map((k) => k.kpi_definition_id)),
    [kpis],
  );

  const available = useMemo(
    () => kpiDefinitions.filter((d) => !attachedDefIds.has(d.id)),
    [kpiDefinitions, attachedDefIds],
  );

  const addKpiSelect =
    available.length > 0 ? (
      <Select onValueChange={(v) => onAdd(v)}>
        <SelectTrigger
          size="sm"
          className="h-7 gap-1 bg-accent text-[11px] font-semibold"
        >
          <Plus className="size-3" />
          <SelectValue placeholder="Додати KPI…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {available.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} ({d.unit})
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    ) : null;

  const showEmbeddedToolbar =
    embedded &&
    (addKpiSelect != null ||
      kpiDefinitions.length === 0 ||
      (kpis.length === 0 && available.length === 0));

  return (
    <div className={cn(!embedded && "mb-4")}>
      {embedded ? (
        showEmbeddedToolbar ? (
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
            {kpiDefinitions.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">
                Спочатку створіть KPI показники
              </span>
            ) : available.length === 0 && kpis.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">
                Усі KPI вже додані
              </span>
            ) : null}
            {addKpiSelect}
          </div>
        ) : null
      ) : (
        <Item size="sm" className="mb-2 align-middle">
          <ItemMedia variant="icon">
            <BarChart3 />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>KPI показники</ItemTitle>
            {kpiDefinitions.length === 0 ? (
              <ItemDescription>Спочатку створіть KPI показники</ItemDescription>
            ) : available.length === 0 ? (
              <ItemDescription>Усі KPI вже додані</ItemDescription>
            ) : null}
          </ItemContent>
          <ItemActions>{addKpiSelect}</ItemActions>
        </Item>
      )}

      {kpis.length > 0 && (
        <div
          className={cn(
            "grid gap-2",
            embedded
              ? "grid-cols-1 sm:grid-cols-2"
              : "[grid-template-columns:repeat(auto-fit,minmax(min(100%,max(12rem,calc((100%-1rem)/3))),1fr))]",
          )}
        >
          {kpis.map((k) => {
          const kac = getAccentDef(k.color ?? goalColor);
          const pct = k.target
            ? Math.min(100, Math.round((k.current / k.target) * 100))
            : 0;
          const isComplete = k.current >= k.target;
          const onTrack = pct >= 50;

          return (
            <div key={k.id} className="rounded-lg border border-border/80 p-3 min-w-0 flex flex-col gap-2">
              {/* Header: name + delete */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  {k.status === "Завершено" && (
                    <CheckCircle2 className="size-3 shrink-0 text-success" />
                  )}
                  {k.name}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 shrink-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      onClick={() =>
                        confirm(
                          `Відʼєднати KPI «${k.name || "без назви"}» від цілі?`,
                          () => onRemove(k.id),
                        )
                      }
                    >
                      <X className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Відʼєднати KPI</TooltipContent>
                </Tooltip>
              </div>

              {/* Value + edit */}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xl font-semibold tabular-nums",
                    isComplete ? "text-success" : kac.text,
                  )}
                >
                  {fmtNum(k.current)}
                </span>
                {k.status !== "Завершено" && (
                  <KpiEditDialog
                    kpi={k}
                    onSave={(newVal, comment, newTarget) =>
                      onUpdate(
                        k.id,
                        (kk) => ({ ...kk, current: newVal, ...(newTarget !== undefined ? { target: newTarget } : {}) }),
                        comment,
                      )
                    }
                  />
                )}
                <span className="ml-auto text-[11px] font-medium text-muted-foreground">{pct}%</span>
              </div>

              {/* Progress */}
              <ProgressBar
                current={k.current}
                target={k.target}
                colorClass={isComplete ? "bg-success" : kac.bg}
              />

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className={cn("text-[13px] font-semibold", kac.text)}>
                  Ціль: {fmtNum(k.target)} {k.unit}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  {isComplete
                    ? "Ціль досягнуто"
                    : onTrack
                      ? "Прогрес у нормі"
                      : "Потрібне прискорення"}
                  {onTrack || isComplete
                    ? <TrendingUp className="size-3.5 shrink-0" />
                    : <TrendingDown className="size-3.5 shrink-0" />}
                </span>
              </div>

              {/* KPI Status */}
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        "cursor-pointer outline-none transition-colors hover:opacity-80",
                        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                        KPI_STATUS_STYLES[k.status ?? "В процесі"],
                      )}
                    >
                      <CircleDot className="size-2.5" />
                      {k.status ?? "В процесі"}
                      <ChevronDown className="size-2.5 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[140px]">
                    <DropdownMenuGroup>
                      {KPI_STAT.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          className={cn(k.status === s && "bg-accent font-semibold")}
                          onSelect={() => onUpdateStatus(k.id, s)}
                        >
                          <span
                            className={cn(
                              "size-2 rounded-full shrink-0",
                              s === "Завершено" ? "bg-success" : "bg-sky-500",
                            )}
                          />
                          {s}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <KpiLastChange goalKpiId={k.id} optimistic={kpiLastChanges?.[k.id]} />
              <KpiHistoryDialog kpi={k} />
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
