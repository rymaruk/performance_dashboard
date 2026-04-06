import { cn } from "@/lib/utils";
import { Editable } from "../ui";
import { ProgressBar } from "../ui/progress-bar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { medDate } from "../../utils/date";
import { getAccentDef } from "../../constants";
import { BarChart3 } from "lucide-react";
import type { KPI, Project, Team } from "../../types";

interface KPIPanelProps {
  proj: Project;
  teams: Team[];
  onUpdateKPI: (gid: string, kid: string, fn: (k: KPI) => KPI) => void;
}

export function KPIPanel({ proj, teams, onUpdateKPI }: KPIPanelProps) {
  const teamName = (teamId: string | null | undefined) =>
    teams.find((t) => t.id === teamId)?.name ?? "Без команди";
  return (
    <div>
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-[15px] flex items-center gap-1.5">
            <BarChart3 className="size-4" /> KPI зведення
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proj.goals.map((g) => {
            if (!g.kpis.length) return null;
            const gac = getAccentDef(g.color);

            return (
              <div key={g.id} className="mb-5">
                <div className="text-[13px] font-bold mb-2 flex items-center gap-1.5 text-foreground">
                  <span className={cn("w-2.5 h-2.5 rounded-full inline-block", gac.bg)} />
                  {g.title}
                  <Badge variant="secondary" className={cn("text-[10px] ml-1", gac.text)}>{teamName(g.team_id)}</Badge>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ({medDate(g.startDate)}–{medDate(g.endDate)})
                  </span>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
                  {g.kpis.map((k) => {
                    const kac = getAccentDef(k.color ?? g.color);
                    const pct = k.target ? Math.min(100, Math.round((k.current / k.target) * 100)) : 0;
                    return (
                      <div
                        key={k.id}
                        className={cn("bg-muted rounded-lg px-3.5 py-3 border-t-[3px]", pct >= 100 ? "border-success" : kac.border)}
                      >
                        <div className={cn("text-[11px] font-semibold mb-1.5", kac.text)}>{k.name}</div>
                        <div className="flex justify-between items-baseline mb-1.5">
                          <Editable
                            value={k.current}
                            onChange={(v) => onUpdateKPI(g.id, k.id, (kk) => ({ ...kk, current: Number(v) }))}
                            type="number"
                            className={cn("text-[22px] font-extrabold", pct >= 100 ? "text-success" : kac.text)}
                          />
                          <span className="text-[11px] text-muted-foreground">/ {k.target} {k.unit}</span>
                        </div>
                        <ProgressBar current={k.current} target={k.target} colorClass={pct >= 100 ? "bg-success" : kac.bg} h={8} />
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
