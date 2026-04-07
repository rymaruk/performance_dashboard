import { useMemo, useState } from "react";
import { uk } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { medDate, shortDate } from "../../utils/date";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChangeStart?: (v: string) => void;
  onChangeEnd?: (v: string) => void;
  /** Fires once with both values when a complete range is selected. Preferred over onChangeStart/onChangeEnd for atomic updates. */
  onChangeRange?: (from: string, to: string) => void;
  minDate?: string;
  maxDate?: string;
  size?: "sm" | "md";
  variant?: "default" | "gantt";
  /** When set, show this text on the trigger button instead of dates until the picker is used. */
  placeholder?: string;
}

const toDate = (s: string) => new Date(s + "T00:00:00");
const toStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function DateRangePicker({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  onChangeRange,
  minDate,
  maxDate,
  size = "md",
  variant = "default",
  placeholder,
}: DateRangePickerProps) {
  const isSm = size === "sm";
  const isGantt = variant === "gantt";

  /**
   * Internal range state that drives the calendar.
   * - null  → show the committed (parent) range; first click starts a new selection.
   * - {from}  → user picked start; waiting for end click.
   * - {from,to} → never stored here; committed to parent immediately.
   */
  const [draft, setDraft] = useState<DateRange | null>(null);

  const committed = useMemo<DateRange>(
    () => ({ from: toDate(startDate), to: toDate(endDate) }),
    [startDate, endDate],
  );

  const displayed = draft ?? committed;

  const handleDayClick = (day: Date) => {
    if (!draft) {
      // First click — start a brand-new range (only "from").
      setDraft({ from: day, to: undefined });
    } else {
      // Second click — complete the range.
      const start = draft.from!;
      const from = day < start ? day : start;
      const to = day < start ? start : day;
      setDraft(null);
      const fromStr = toStr(from);
      const toStr_ = toStr(to);
      if (onChangeRange) {
        onChangeRange(fromStr, toStr_);
      } else {
        onChangeStart?.(fromStr);
        onChangeEnd?.(toStr_);
      }
    }
  };

  const disabledMatcher = useMemo(() => {
    const matchers: Array<{ before?: Date; after?: Date }> = [];
    if (minDate) matchers.push({ before: toDate(minDate) });
    if (maxDate) matchers.push({ after: toDate(maxDate) });
    return matchers.length > 0 ? matchers : undefined;
  }, [minDate, maxDate]);

  return (
    <Popover
      onOpenChange={(open) => {
        // If popover closes while a draft is in progress, discard it.
        if (!open) setDraft(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant={isGantt ? "ghost" : "outline"}
          className={cn(
            "inline-flex items-center whitespace-nowrap h-auto",
            isGantt
              ? "gap-0.5 p-0 text-[8px] font-bold text-primary-foreground bg-transparent border-none leading-none opacity-90 hover:opacity-100 hover:bg-transparent [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]"
              : cn(
                  "font-semibold",
                  isSm
                    ? "gap-0.5 px-2 py-0.5 text-[10px]"
                    : "gap-1 px-2.5 py-1 text-[11px]",
                ),
          )}
        >
          {!isGantt && <CalendarIcon className={isSm ? "size-3" : "size-3.5"} />}
          {placeholder ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              <span>{isGantt ? shortDate(startDate) : medDate(startDate)}</span>
              <span
                className={
                  isGantt
                    ? "text-primary-foreground/60"
                    : "text-muted-foreground"
                }
              >
                {isGantt ? "\u2013" : "\u2192"}
              </span>
              <span>{isGantt ? shortDate(endDate) : medDate(endDate)}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={toDate(startDate)}
          selected={displayed}
          onDayClick={handleDayClick}
          numberOfMonths={2}
          disabled={disabledMatcher}
          locale={uk}
        />
      </PopoverContent>
    </Popover>
  );
}
