import { useRef, useState, useCallback } from "react";
import { addDays, diffDays } from "../utils/date";

type DragMode = "move" | "resize-left" | "resize-right";

const HANDLE_ZONE = 7;
const MIN_DURATION = 1; // at least 1 day

interface UseDragBarOptions {
  startDate: string;
  endDate: string;
  pxPerDay: number;
  ganttStart: string;
  minDate?: string;
  maxDate?: string;
  onCommit: (newStart: string, newEnd: string) => void;
}

/**
 * Given the original dates, a pixel delta, and a drag mode,
 * compute clamped new dates.
 */
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
    // Clamp to boundaries, preserving duration
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
    // Clamp: can't go past end - MIN_DURATION
    const maxStart = addDays(origEnd, -MIN_DURATION);
    if (newStart > maxStart) newStart = maxStart;
    // Clamp: can't go before minDate
    if (minDate && newStart < minDate) newStart = minDate;
  } else if (mode === "resize-right") {
    newEnd = addDays(origEnd, deltaDays);
    // Clamp: can't go before start + MIN_DURATION
    const minEnd = addDays(origStart, MIN_DURATION);
    if (newEnd < minEnd) newEnd = minEnd;
    // Clamp: can't go past maxDate
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

  /**
   * During drag we store absolute pixel position { left, width }
   * rather than offsets — this avoids dependency on potentially-changing props.
   * null = no drag in progress.
   */
  const [dragPos, setDragPos] = useState<{ left: number; width: number } | null>(null);

  // All mutable drag state lives in a single ref — no stale closures
  const drag = useRef<{
    mode: DragMode;
    startX: number;
    origStartDate: string;
    origEndDate: string;
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
      const bar = barRef.current;
      if (!bar) return;

      const rect = bar.getBoundingClientRect();
      const localX = e.clientX - rect.left;

      let mode: DragMode = "move";
      if (localX <= HANDLE_ZONE) mode = "resize-left";
      else if (localX >= rect.width - HANDLE_ZONE) mode = "resize-right";

      // Snapshot the dates at drag start — these never change during drag
      drag.current = {
        mode,
        startX: e.clientX,
        origStartDate: startDate,
        origEndDate: endDate,
      };

      // Set initial position = current bar position
      setDragPos(datesToPx(startDate, endDate));
      bar.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    },
    [startDate, endDate, datesToPx],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d) return;

      const deltaPx = e.clientX - d.startX;
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

      const deltaPx = e.clientX - d.startX;
      const { newStart, newEnd } = computeNewDates(
        d.origStartDate, d.origEndDate, deltaPx, pxPerDay, d.mode, minDate, maxDate,
      );

      drag.current = null;
      setDragPos(null);

      if (newStart !== d.origStartDate || newEnd !== d.origEndDate) {
        onCommit(newStart, newEnd);
      }

      e.preventDefault();
      e.stopPropagation();
    },
    [pxPerDay, minDate, maxDate, onCommit],
  );

  // Cursor hint on hover (only when not dragging)
  const onPointerMoveHover = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (drag.current) return;
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      if (localX <= HANDLE_ZONE || localX >= rect.width - HANDLE_ZONE) {
        bar.style.cursor = "ew-resize";
      } else {
        bar.style.cursor = "grab";
      }
    },
    [],
  );

  const isDragging = dragPos !== null;

  return {
    barRef,
    /** Absolute { left, width } in px during drag, or null. Use these to override bar style. */
    dragPos,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove: isDragging ? onPointerMove : onPointerMoveHover,
      onPointerUp,
    },
  };
}
