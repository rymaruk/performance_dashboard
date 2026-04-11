import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { KpiValueHistory } from "../types";

export function useKpiLastChange(
  goalKpiId: string,
  optimistic?: KpiValueHistory | null,
) {
  const [fetched, setFetched] = useState<KpiValueHistory | null>(null);

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
          setFetched(data[0] as KpiValueHistory);
        }
      });
    return () => { cancelled = true; };
  }, [goalKpiId]);

  // Optimistic value takes priority over the initial DB fetch
  const last = optimistic ?? fetched;
  const diff = last ? last.new_value - last.old_value : null;

  return { last, diff };
}
