import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Editable } from "../ui";
import { ProgressBar } from "../ui/progress-bar";
import { Button } from "../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { X, BarChart3, Plus } from "lucide-react";
import type { KPI, KpiDefinition } from "../../types";

interface KPITableProps {
  goalId: string;
  kpis: KPI[];
  kpiDefinitions: KpiDefinition[];
  onAdd: (kpiDefId: string) => void;
  onRemove: (kid: string) => void;
  onUpdate: (kid: string, fn: (k: KPI) => KPI) => void;
}

export function KPITable({ kpis, kpiDefinitions, onAdd, onRemove, onUpdate }: KPITableProps) {
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
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-foreground flex items-center gap-1">
          <BarChart3 className="size-3.5" /> KPI показники
        </span>
        {available.length > 0 ? (
          <Select onValueChange={(v) => onAdd(v)}>
            <SelectTrigger size="sm" className="h-7 gap-1 bg-accent text-[11px] font-semibold">
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
        ) : (
          <span className="text-[10px] text-muted-foreground">
            {kpiDefinitions.length === 0 ? "Спочатку створіть KPI показники" : "Усі KPI вже додані"}
          </span>
        )}
      </div>

      {kpis.length > 0 && (
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              {["Показник", "Поточне", "Ціль", "Од.", "Прогрес", ""].map((h, i) => (
                <TableHead key={i} className="h-8 text-[11px] font-semibold">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {kpis.map((k) => (
              <TableRow key={k.id}>
                <TableCell>
                  <span className="font-medium text-foreground">{k.name}</span>
                </TableCell>
                <TableCell>
                  <Editable
                    value={k.current}
                    onChange={(v) => onUpdate(k.id, (kk) => ({ ...kk, current: Number(v) }))}
                    type="number"
                    className={cn("font-bold", k.current >= k.target ? "text-success" : "text-chart-5")}
                  />
                </TableCell>
                <TableCell>
                  <Editable value={k.target} onChange={(v) => onUpdate(k.id, (kk) => ({ ...kk, target: Number(v) }))} type="number" />
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-muted-foreground">{k.unit}</span>
                </TableCell>
                <TableCell className="w-[110px]">
                  <ProgressBar current={k.current} target={k.target} colorClass={k.current >= k.target ? "bg-success" : "bg-primary"} />
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={() => confirm(`Відʼєднати KPI «${k.name || "без назви"}» від цілі?`, () => onRemove(k.id))}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Відʼєднати KPI</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
