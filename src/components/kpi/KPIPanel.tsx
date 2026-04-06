import { cn } from "@/lib/utils";
import { Editable } from "../ui";
import { ProgressBar } from "../ui/progress-bar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { medDate } from "../../utils/date";
import { BarChart3 } from "lucide-react";
import type { KPI, Project } from "../../types";

const CHART_COLORS = [
  { dot: "bg-chart-1", bar: "bg-chart-1", text: "text-chart-1" },
  { dot: "bg-chart-2", bar: "bg-chart-2", text: "text-chart-2" },
  { dot: "bg-chart-3", bar: "bg-chart-3", text: "text-chart-3" },
  { dot: "bg-chart-4", bar: "bg-chart-4", text: "text-chart-4" },
  { dot: "bg-chart-5", bar: "bg-chart-5", text: "text-chart-5" },
];

interface KPIPanelProps {
  proj: Project;
  onUpdateKPI: (gid: string, kid: string, fn: (k: KPI) => KPI) => void;
}

export function KPIPanel({ proj, onUpdateKPI }: KPIPanelProps) {
  return (
    <div>
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-[15px] flex items-center gap-1.5">
            <BarChart3 className="size-4" /> KPI зведення
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proj.goals.map((g, gi) => {
            if (!g.kpis.length) return null;
            const c = CHART_COLORS[gi % CHART_COLORS.length];

            return (
              <div key={g.id} className="mb-5">
                <div className="text-[13px] font-bold mb-2 flex items-center gap-1.5 text-foreground">
                  <span className={cn("w-2.5 h-2.5 rounded-full inline-block", c.dot)} />
                  {g.title}
                  <Badge variant="secondary" className="text-[10px] ml-1">{g.owner}</Badge>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ({medDate(g.startDate)}–{medDate(g.endDate)})
                  </span>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
                  {g.kpis.map((k) => {
                    const pct = k.target ? Math.min(100, Math.round((k.current / k.target) * 100)) : 0;
                    return (
                      <div
                        key={k.id}
                        className={cn("bg-muted rounded-lg px-3.5 py-3 border-t-[3px]", pct >= 100 ? "border-success" : "border-transparent")}
                      >
                        <div className="text-[11px] font-semibold text-foreground mb-1.5">{k.name}</div>
                        <div className="flex justify-between items-baseline mb-1.5">
                          <Editable
                            value={k.current}
                            onChange={(v) => onUpdateKPI(g.id, k.id, (kk) => ({ ...kk, current: Number(v) }))}
                            type="number"
                            className={cn("text-[22px] font-extrabold", pct >= 100 ? "text-success" : "text-foreground")}
                          />
                          <span className="text-[11px] text-muted-foreground">/ {k.target} {k.unit}</span>
                        </div>
                        <ProgressBar current={k.current} target={k.target} colorClass={pct >= 100 ? "bg-success" : c.bar} h={8} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
