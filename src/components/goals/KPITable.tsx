import { useMemo } from "react";
import clsx from "clsx";
import { Editable, Progress } from "../ui";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import type { KPI, KpiDefinition } from "../../types";

interface KPITableProps {
  goalId: string;
  kpis: KPI[];
  kpiDefinitions: KpiDefinition[];
  onAdd: (kpiDefId: string) => void;
  onRemove: (kid: string) => void;
  onUpdate: (kid: string, fn: (k: KPI) => KPI) => void;
}

export function KPITable({ kpis, kpiDefinitions, onAdd, onRemove, onUpdate }: KPITableProps) {
  const confirm = useConfirmAction();

  const attachedDefIds = useMemo(
    () => new Set(kpis.map((k) => k.kpi_definition_id)),
    [kpis],
  );

  const available = useMemo(
    () => kpiDefinitions.filter((d) => !attachedDefIds.has(d.id)),
    [kpiDefinitions, attachedDefIds],
  );

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-gray-700">📈 KPI показники</span>
        {available.length > 0 ? (
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAdd(e.target.value);
                e.target.value = "";
              }
            }}
            defaultValue=""
            className="px-2.5 py-1 text-[11px] border border-teal-500 text-teal-700 rounded-lg cursor-pointer bg-teal-50 font-semibold focus:ring-2 focus:ring-teal-200 outline-none"
          >
            <option value="" disabled>＋ Додати KPI…</option>
            {available.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.unit})</option>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-gray-400">
            {kpiDefinitions.length === 0 ? "Спочатку створіть KPI показники" : "Усі KPI вже додані"}
          </span>
        )}
      </div>

      {kpis.length > 0 && (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              {["Показник", "Поточне", "Ціль", "Од.", "Прогрес", ""].map((h, i) => (
                <th key={i} className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kpis.map((k) => (
              <tr key={k.id} className="border-b border-gray-200">
                <td className="px-2 py-1.5">
                  <span className="font-medium text-gray-800">{k.name}</span>
                </td>
                <td className="px-2 py-1.5">
                  <Editable
                    value={k.current}
                    onChange={(v) => onUpdate(k.id, (kk) => ({ ...kk, current: Number(v) }))}
                    type="number"
                    className={clsx("font-bold", k.current >= k.target ? "text-green-700" : "text-orange-700")}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Editable value={k.target} onChange={(v) => onUpdate(k.id, (kk) => ({ ...kk, target: Number(v) }))} type="number" />
                </td>
                <td className="px-2 py-1.5">
                  <span className="text-[11px] text-gray-500">{k.unit}</span>
                </td>
                <td className="px-2 py-1.5 w-[110px]">
                  <Progress current={k.current} target={k.target} colorClass={k.current >= k.target ? "bg-green-500" : "bg-primary-500"} />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => confirm(`Відʼєднати KPI «${k.name || "без назви"}» від цілі?`, () => onRemove(k.id))}
                    className="bg-transparent border-none cursor-pointer text-red-500 text-[13px] px-1.5 py-0.5 leading-none hover:text-red-700"
                    title="Відʼєднати KPI"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
