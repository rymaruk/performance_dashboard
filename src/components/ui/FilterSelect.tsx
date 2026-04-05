import { useState, useRef } from "react";
import { CustomSelect } from "./CustomSelect";
import clsx from "clsx";

interface FilterSelectProps {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}

export function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex items-center">
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border cursor-pointer select-none transition-all whitespace-nowrap",
          value
            ? "text-gray-900 bg-primary-50 border-primary-200"
            : "text-gray-500 bg-white border-gray-300 hover:border-gray-400",
        )}
      >
        <span className="text-gray-500 font-semibold">{label}:</span>
        <span>{value || "Усі"}</span>

        {value ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              setOpen(false);
            }}
            className="ml-0.5 px-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600 cursor-pointer rounded leading-none"
            title="Скинути фільтр"
          >
            ✕
          </span>
        ) : (
          <span
            className={clsx(
              "text-[8px] ml-0.5 transition-transform",
              open && "rotate-180",
            )}
          >
            ▼
          </span>
        )}
      </div>

      {open && (
        <CustomSelect
          value={value || ""}
          options={options}
          triggerRef={triggerRef}
          onSelect={(v) => {
            onChange(v);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
