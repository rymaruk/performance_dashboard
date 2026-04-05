import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { medDate, shortDate } from "../../utils/date";
import clsx from "clsx";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  minDate?: string;
  maxDate?: string;
  size?: "sm" | "md";
  variant?: "default" | "gantt";
}

const toDate = (s: string) => new Date(s + "T00:00:00");
const toStr = (d: Date) => d.toISOString().slice(0, 10);
const TOOLTIP_GAP = 6;

export function DateRangePicker({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  minDate,
  maxDate,
  size = "md",
  variant = "default",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const reposition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    const tt = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = tr.bottom + TOOLTIP_GAP + window.scrollY;
    let left = tr.left + window.scrollX;

    if (tr.bottom + TOOLTIP_GAP + tt.height > vh) {
      top = tr.top - tt.height - TOOLTIP_GAP + window.scrollY;
    }
    if (left + tt.width > vw + window.scrollX - 8) {
      left = vw + window.scrollX - tt.width - 8;
    }
    if (left < window.scrollX + 8) {
      left = window.scrollX + 8;
    }
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, startDate, endDate, reposition]);

  useEffect(() => {
    if (!open) return;
    const handler = () => reposition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        tooltipRef.current && !tooltipRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isSm = size === "sm";
  const isGantt = variant === "gantt";

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={clsx(
          "inline-flex items-center cursor-pointer whitespace-nowrap",
          isGantt
            ? "gap-0.5 p-0 text-[8px] font-bold text-white bg-transparent border-none leading-none opacity-90 hover:opacity-100 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]"
            : clsx(
                "font-semibold bg-white border rounded-md transition-all",
                isSm ? "gap-0.5 px-2 py-0.5 text-[10px]" : "gap-1 px-2.5 py-1 text-[11px]",
                open
                  ? "border-primary-500 ring-2 ring-primary-100 text-gray-700"
                  : "border-gray-300 text-gray-700 hover:border-gray-400",
              ),
        )}
      >
        {!isGantt && <span className={isSm ? "text-[9px]" : "text-[10px]"}>📅</span>}
        <span>{isGantt ? shortDate(startDate) : medDate(startDate)}</span>
        <span className={isGantt ? "text-white/60" : "text-gray-400"}>
          {isGantt ? "–" : "→"}
        </span>
        <span>{isGantt ? shortDate(endDate) : medDate(endDate)}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute z-[10000] bg-white rounded-xl shadow-2xl border border-gray-200 p-3.5 flex gap-4 items-start"
            style={{ top: pos.top, left: pos.left }}
          >
            <div>
              <div className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                Початок
              </div>
              <DatePicker
                selected={toDate(startDate)}
                onChange={(date: Date | null) => {
                  if (date) onChangeStart(toStr(date));
                }}
                minDate={minDate ? toDate(minDate) : undefined}
                maxDate={toDate(endDate)}
                inline
                calendarClassName="dp-tooltip-cal"
              />
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                Кінець
              </div>
              <DatePicker
                selected={toDate(endDate)}
                onChange={(date: Date | null) => {
                  if (date) onChangeEnd(toStr(date));
                }}
                minDate={toDate(startDate)}
                maxDate={maxDate ? toDate(maxDate) : undefined}
                inline
                calendarClassName="dp-tooltip-cal"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
