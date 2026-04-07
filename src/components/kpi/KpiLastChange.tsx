import { useEffect, useState } from "react";
import { medDate } from "../../utils/date";
import { supabase } from "../../lib/supabase";
import type { KpiValueHistory } from "../../types";

interface KpiLastChangeProps {
  goalKpiId: string;
}

export function KpiLastChange({ goalKpiId }: KpiLastChangeProps) {
  const [last, setLast] = useState<KpiValueHistory | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("kpi_value_history")
      .select("*")
      .eq("goal_kpi_id", goalKpiId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!cancelled && data && data.length > 0) {
          setLast(data[0] as KpiValueHistory);
        }
      });
    return () => { cancelled = true; };
  }, [goalKpiId]);

  if (!last) return null;

  return (
    <div className="w-full border-t border-border pt-2 mt-0.5 rounded bg-muted/50 px-2.5 py-2 text-[10px] leading-snug">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{last.user_name || "—"}</span>
        <span className="tabular-nums text-muted-foreground">{medDate(last.created_at.slice(0, 10))}</span>
      </div>
      <div className="mt-1 font-bold text-foreground text-[11px]">
        {last.old_value} → {last.new_value}
      </div>
      {last.comment && (
        <div className="mt-0.5 line-clamp-2 text-muted-foreground italic" title={last.comment}>
          {last.comment}
        </div>
      )}
    </div>
  );
}
