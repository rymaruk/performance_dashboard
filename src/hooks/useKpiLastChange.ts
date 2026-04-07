import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { KpiValueHistory } from "../types";

export function useKpiLastChange(goalKpiId: string) {
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

  const diff = last ? last.new_value - last.old_value : null;

  return { last, diff };
}
