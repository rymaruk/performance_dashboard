import clsx from "clsx";

interface DatePickProps {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  className?: string;
}

export function DatePick({ value, onChange, min, max, className }: DatePickProps) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "border border-gray-300 rounded px-1.5 py-0.5 text-xs font-inherit bg-white cursor-pointer outline-none",
        "focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow",
        className,
      )}
    />
  );
}
