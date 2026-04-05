import clsx from "clsx";
import { Editable, Progress } from "../ui";
import { roleColor } from "../../utils/roleColor";
import { medDate } from "../../utils/date";
import type { KPI, Project } from "../../types";

interface KPIPanelProps {
  proj: Project;
  onUpdateKPI: (gid: string, kid: string, fn: (k: KPI) => KPI) => void;
}

export function KPIPanel({ proj, onUpdateKPI }: KPIPanelProps) {
  return (
    <div>
      <div className="bg-white rounded-lg m-4 p-5 shadow-sm">
        <div className="text-[15px] font-bold mb-3.5">📈 KPI зведення</div>

        {proj.goals.map((g) => {
          if (!g.kpis.length) return null;
          const rc = roleColor(g.owner);

          return (
            <div key={g.id} className="mb-5">
              <div className={clsx("text-[13px] font-bold mb-2 flex items-center gap-1.5", rc.text700)}>
                <span className={clsx("w-2.5 h-2.5 rounded-full inline-block", rc.bg500)} />
                {g.title}{" "}
                <span className="text-[10px] text-gray-500">
                  ({medDate(g.startDate)}–{medDate(g.endDate)})
                </span>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
                {g.kpis.map((k) => {
                  const pct = k.target ? Math.min(100, Math.round((k.current / k.target) * 100)) : 0;
                  return (
                    <div
                      key={k.id}
                      className={clsx("bg-gray-50 rounded-lg px-3.5 py-3 border-t-[3px]", pct >= 100 ? "border-green-500" : "")}
                    >
                      <div className="text-[11px] font-semibold text-gray-700 mb-1.5">{k.name}</div>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <Editable
                          value={k.current}
                          onChange={(v) => onUpdateKPI(g.id, k.id, (kk) => ({ ...kk, current: Number(v) }))}
                          type="number"
                          className={clsx("text-[22px] font-extrabold", pct >= 100 ? "text-green-700" : "text-gray-900")}
                        />
                        <span className="text-[11px] text-gray-500">/ {k.target} {k.unit}</span>
                      </div>
                      <Progress current={k.current} target={k.target} colorClass={pct >= 100 ? "bg-green-500" : rc.bg500} h={8} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
