import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  target: number;
  colorClass?: string;
  h?: number;
}

export function ProgressBar({
  current,
  target,
  colorClass = "bg-primary",
  h = 6,
}: ProgressBarProps) {
  const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex-1 bg-muted rounded-full overflow-hidden"
        style={{ height: h }}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[10px] font-bold min-w-[30px] text-right",
          pct >= 100 ? "text-success" : "text-muted-foreground",
        )}
      >
        {pct}%
      </span>
    </div>
  );
}
