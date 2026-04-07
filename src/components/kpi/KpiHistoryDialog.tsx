import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { History, Loader2 } from "lucide-react";
import { medDate } from "../../utils/date";
import { fmtNum } from "../../utils/format";
import { supabase } from "../../lib/supabase";
import type { KPI, KpiValueHistory } from "../../types";

interface KpiHistoryDialogProps {
  kpi: KPI;
}

export function KpiHistoryDialog({ kpi }: KpiHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<KpiValueHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("kpi_value_history")
      .select("*")
      .eq("goal_kpi_id", kpi.id)
      .order("created_at", { ascending: false });
    setHistory((data as KpiValueHistory[]) ?? []);
    setLoading(false);
  }, [kpi.id]);

  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="link"
          size="sm"
          className="h-6 gap-1 px-1.5 ml-[-6px] text-[10px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <History className="size-3" />
          Уся історія
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Історія змін</DialogTitle>
          <DialogDescription>
            {kpi.name} ({kpi.unit})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Ще немає записів про зміни
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-semibold">Дата</th>
                  <th className="pb-2 pr-2 font-semibold">Було</th>
                  <th className="pb-2 pr-2 font-semibold">Стало</th>
                  <th className="pb-2 pr-2 font-semibold">Коментар</th>
                  <th className="pb-2 font-semibold">Хто</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border/50">
                    <td className="py-2 pr-2 tabular-nums whitespace-nowrap text-muted-foreground">
                      {medDate(h.created_at.slice(0, 10))}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{fmtNum(h.old_value)}</td>
                    <td className="py-2 pr-2 tabular-nums font-semibold">{fmtNum(h.new_value)}</td>
                    <td className="py-2 pr-2 max-w-[200px] truncate" title={h.comment}>
                      {h.comment || "—"}
                    </td>
                    <td className="py-2 whitespace-nowrap text-muted-foreground">
                      {h.user_name || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
