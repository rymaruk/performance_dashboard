import { useMemo } from "react";
import { cn } from "@/lib/utils";
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
import { X, BarChart3, Plus, TrendingUp, TrendingDown } from "lucide-react";
import type { KPI, KpiDefinition } from "../../types";

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
}

export function KPITable({
  goalColor,
  kpis,
  kpiDefinitions,
  embedded = false,
  onAdd,
  onRemove,
  onUpdate,
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
                <span className="text-[11px] text-muted-foreground truncate">{k.name}</span>
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
                  {k.current}
                </span>
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
                  Ціль: {k.target} {k.unit}
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

              <KpiLastChange goalKpiId={k.id} />
              <KpiHistoryDialog kpi={k} />
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
