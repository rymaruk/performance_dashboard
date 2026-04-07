import { cn } from "@/lib/utils";
import { fmtNum } from "../../utils/format";
import { useKpiLastChange } from "../../hooks/useKpiLastChange";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

interface KpiDiffBadgeProps {
  goalKpiId: string;
}

export function KpiDiffBadge({ goalKpiId }: KpiDiffBadgeProps) {
  const { last, diff } = useKpiLastChange(goalKpiId);

  if (diff === null || diff === 0 || !last) return null;

  const isPositive = diff > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "text-[16px] font-medium tabular-nums cursor-default",
            isPositive ? "text-success" : "text-destructive",
          )}
        >
          {isPositive ? "+" : ""}{fmtNum(diff)}
        </span>
      </TooltipTrigger>
      <TooltipContent className={cn(isPositive ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
        Було {fmtNum(last.old_value)}, стало {fmtNum(last.new_value)}
      </TooltipContent>
    </Tooltip>
  );
}
