import { medDate } from "../../utils/date";
import { fmtNum } from "../../utils/format";
import { useKpiLastChange } from "../../hooks/useKpiLastChange";

interface KpiLastChangeProps {
  goalKpiId: string;
  revision?: number;
}

export function KpiLastChange({ goalKpiId, revision }: KpiLastChangeProps) {
  const { last } = useKpiLastChange(goalKpiId, revision);

  if (!last) return null;

  return (
    <div className="w-full border-t border-border pt-2 mt-0.5 rounded bg-muted/50 px-2.5 py-2 text-[10px] leading-snug">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{last.user_name || "—"}</span>
        <span className="tabular-nums text-muted-foreground">{medDate(last.created_at.slice(0, 10))}</span>
      </div>
      <div className="mt-1 font-bold text-foreground text-[11px]">
        {fmtNum(last.old_value)} → {fmtNum(last.new_value)}
      </div>
      {last.comment && (
        <div className="mt-0.5 line-clamp-2 text-muted-foreground italic" title={last.comment}>
          {last.comment}
        </div>
      )}
    </div>
  );
}
