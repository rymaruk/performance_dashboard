import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { ProgressBar } from "../ui/progress-bar";
import { Button } from "../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
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
import { X, BarChart3, Plus } from "lucide-react";
import type { KPI, KpiDefinition } from "../../types";

interface KPITableProps {
  goalId: string;
  goalColor?: string | null;
  kpis: KPI[];
  kpiDefinitions: KpiDefinition[];
  onAdd: (kpiDefId: string) => void;
  onRemove: (kid: string) => void;
  onUpdate: (kid: string, fn: (k: KPI) => KPI) => void;
}

export function KPITable({
  goalColor,
  kpis,
  kpiDefinitions,
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

  return (
    <div className="mb-4">
      <Item size="sm" className="mb-2">
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
        <ItemActions>
          {available.length > 0 && (
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
          )}
        </ItemActions>
      </Item>

      {kpis.length > 0 &&
        kpis.map((k) => {
          const kac = getAccentDef(k.color ?? goalColor);
          const pct = k.target
            ? Math.min(100, Math.round((k.current / k.target) * 100))
            : 0;
          const isComplete = k.current >= k.target;

          return (
            <Item key={k.id} variant="outline" size="sm" className="mb-1.5 items-start">
              <ItemMedia variant="icon" className="mt-0.5 size-7 [&_svg]:size-3.5">
                <div
                  className={cn(
                    "size-3 rounded-full",
                    isComplete ? "bg-success" : kac.bg,
                  )}
                />
              </ItemMedia>
              <ItemContent className="gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <ItemTitle className="truncate">
                    {k.name}
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                      {k.unit}
                    </span>
                  </ItemTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={() =>
                          confirm(
                            `Відʼєднати KPI «${k.name || "без назви"}» від цілі?`,
                            () => onRemove(k.id),
                          )
                        }
                      >
                        <X className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Відʼєднати KPI</TooltipContent>
                  </Tooltip>
                </div>

                <FieldGroup className="grid grid-cols-3 gap-3">
                  <Field>
                    <FieldLabel
                      htmlFor={`kpi-current-${k.id}`}
                      className="text-[10px] text-muted-foreground"
                    >
                      Поточне
                    </FieldLabel>
                    <Input
                      id={`kpi-current-${k.id}`}
                      type="number"
                      value={k.current}
                      onChange={(e) =>
                        onUpdate(k.id, (kk) => ({
                          ...kk,
                          current: Number(e.target.value) || 0,
                        }))
                      }
                      className={cn(
                        "h-7 text-xs font-bold px-2",
                        isComplete ? "text-success" : kac.text,
                      )}
                    />
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor={`kpi-target-${k.id}`}
                      className="text-[10px] text-muted-foreground"
                    >
                      Ціль
                    </FieldLabel>
                    <Input
                      id={`kpi-target-${k.id}`}
                      type="number"
                      value={k.target}
                      onChange={(e) =>
                        onUpdate(k.id, (kk) => ({
                          ...kk,
                          target: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-7 text-xs font-medium px-2"
                    />
                  </Field>

                  <Field>
                    <FieldLabel className="text-[10px] text-muted-foreground">
                      Прогрес
                    </FieldLabel>
                    <FieldContent className="gap-0.5 mt-1">
                      <ProgressBar
                        current={k.current}
                        target={k.target}
                        colorClass={isComplete ? "bg-success" : kac.bg}
                      />
                      <FieldDescription className="text-[10px]">
                        {k.current} / {k.target} {k.unit} ({pct}%)
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </ItemContent>
            </Item>
          );
        })}
    </div>
  );
}
