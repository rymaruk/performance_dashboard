import { useRef, useState, useCallback } from "react";
import { addDays, diffDays } from "../utils/date";

type DragMode = "move" | "resize-left" | "resize-right";

const HANDLE_ZONE = 7;
const MIN_DURATION = 1;
const DRAG_THRESHOLD = 3; // px movement before drag starts

interface UseDragBarOptions {
  startDate: string;
  endDate: string;
  pxPerDay: number;
  ganttStart: string;
  minDate?: string;
  maxDate?: string;
  onCommit: (newStart: string, newEnd: string) => void;
}

function computeNewDates(
  origStart: string,
  origEnd: string,
  deltaPx: number,
  pxPerDay: number,
  mode: DragMode,
  minDate?: string,
  maxDate?: string,
): { newStart: string; newEnd: string } {
  const deltaDays = Math.round(deltaPx / pxPerDay);
  const duration = diffDays(origStart, origEnd);
  let newStart = origStart;
  let newEnd = origEnd;

  if (mode === "move") {
    newStart = addDays(origStart, deltaDays);
    newEnd = addDays(origEnd, deltaDays);
    if (minDate && newStart < minDate) {
      newStart = minDate;
      newEnd = addDays(minDate, duration);
    }
    if (maxDate && newEnd > maxDate) {
      newEnd = maxDate;
      newStart = addDays(maxDate, -duration);
      if (minDate && newStart < minDate) newStart = minDate;
    }
  } else if (mode === "resize-left") {
    newStart = addDays(origStart, deltaDays);
    const maxStart = addDays(origEnd, -MIN_DURATION);
    if (newStart > maxStart) newStart = maxStart;
    if (minDate && newStart < minDate) newStart = minDate;
  } else if (mode === "resize-right") {
    newEnd = addDays(origEnd, deltaDays);
    const minEnd = addDays(origStart, MIN_DURATION);
    if (newEnd < minEnd) newEnd = minEnd;
    if (maxDate && newEnd > maxDate) newEnd = maxDate;
  }

  return { newStart, newEnd };
}

export function useDragBar({
  startDate,
  endDate,
  pxPerDay,
  ganttStart,
  minDate,
  maxDate,
  onCommit,
}: UseDragBarOptions) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<{ left: number; width: number } | null>(null);

  const drag = useRef<{
    mode: DragMode;
    startX: number;
    origStartDate: string;
    origEndDate: string;
    activated: boolean; // true once threshold exceeded
  } | null>(null);

  const datesToPx = useCallback(
    (sd: string, ed: string) => ({
      left: Math.max(0, diffDays(ganttStart, sd)) * pxPerDay,
      width: Math.max((diffDays(sd, ed) + 1) * pxPerDay, 8),
    }),
    [ganttStart, pxPerDay],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Don't intercept clicks on interactive children (DateRangePicker button, popover, etc.)
      const target = e.target as HTMLElement;
      if (target.closest("[data-slot=popover-trigger], [data-slot=popover-content], [data-slot=calendar]")) {
        return;
      }

      const bar = barRef.current;
      if (!bar) return;

      const rect = bar.getBoundingClientRect();
      const localX = e.clientX - rect.left;

      let mode: DragMode = "move";
      if (localX <= HANDLE_ZONE) mode = "resize-left";
      else if (localX >= rect.width - HANDLE_ZONE) mode = "resize-right";

      drag.current = {
        mode,
        startX: e.clientX,
        origStartDate: startDate,
        origEndDate: endDate,
        activated: false,
      };

      bar.setPointerCapture(e.pointerId);
      // Don't preventDefault/stopPropagation yet — allow click-through until threshold
    },
    [startDate, endDate],
  );

  const onPointerMoveUnified = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d) {
        // No drag in progress — just update cursor hint
        const bar = barRef.current;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        bar.style.cursor =
          localX <= HANDLE_ZONE || localX >= rect.width - HANDLE_ZONE
            ? "ew-resize"
            : "grab";
        return;
      }

      const deltaPx = e.clientX - d.startX;

      if (!d.activated) {
        if (Math.abs(deltaPx) < DRAG_THRESHOLD) return;
        d.activated = true;
        setDragPos(datesToPx(d.origStartDate, d.origEndDate));
      }

      const { newStart, newEnd } = computeNewDates(
        d.origStartDate, d.origEndDate, deltaPx, pxPerDay, d.mode, minDate, maxDate,
      );
      setDragPos(datesToPx(newStart, newEnd));
      e.preventDefault();
      e.stopPropagation();
    },
    [pxPerDay, minDate, maxDate, datesToPx],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d) return;

      if (d.activated) {
        const deltaPx = e.clientX - d.startX;
        const { newStart, newEnd } = computeNewDates(
          d.origStartDate, d.origEndDate, deltaPx, pxPerDay, d.mode, minDate, maxDate,
        );

        if (newStart !== d.origStartDate || newEnd !== d.origEndDate) {
          onCommit(newStart, newEnd);
        }

        e.preventDefault();
        e.stopPropagation();
      }
      // If not activated (click without drag), don't prevent — let click propagate to DateRangePicker

      drag.current = null;
      setDragPos(null);
    },
    [pxPerDay, minDate, maxDate, onCommit],
  );

  const isDragging = dragPos !== null;

  return {
    barRef,
    dragPos,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove: onPointerMoveUnified,
      onPointerUp,
    },
  };
}
