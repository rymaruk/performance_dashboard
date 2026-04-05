import clsx from "clsx";

interface ProgressProps {
  current: number;
  target: number;
  colorClass?: string;
  h?: number;
}

export function Progress({
  current,
  target,
  colorClass = "bg-primary-500",
  h = 6,
}: ProgressProps) {
  const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex-1 bg-gray-200 rounded-full overflow-hidden"
        style={{ height: h }}
      >
        <div
          className={clsx("h-full rounded-full transition-[width] duration-300", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={clsx(
          "text-[10px] font-bold min-w-[30px] text-right",
          pct >= 100 ? "text-green-700" : "text-gray-600",
        )}
      >
        {pct}%
      </span>
    </div>
  );
}
