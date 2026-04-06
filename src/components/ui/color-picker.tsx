import { cn } from "@/lib/utils";
import { ACCENT_COLORS, getAccentDef } from "../../constants";
import type { AccentColor } from "../../constants";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

interface ColorPickerProps {
  value: string | null | undefined;
  onChange: (color: AccentColor) => void;
  size?: "sm" | "md";
}

function stopPropagation(e: React.MouseEvent | React.PointerEvent) {
  e.stopPropagation();
}

export function ColorPicker({ value, onChange, size = "md" }: ColorPickerProps) {
  const current = getAccentDef(value);
  const dotSize = size === "sm" ? "size-4" : "size-5";

  return (
    <div onClick={stopPropagation} onPointerDown={stopPropagation}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "rounded-full ring-2 ring-offset-1 ring-offset-background transition-shadow hover:ring-foreground/40 shrink-0 cursor-pointer",
              dotSize,
              current.bg,
              "ring-transparent",
            )}
            title={current.label}
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-2"
          align="start"
          side="bottom"
          onPointerDownOutside={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-5 gap-1.5" onClick={stopPropagation}>
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(c.key);
                }}
                className={cn(
                  "size-7 rounded-full transition-all cursor-pointer",
                  c.bg,
                  c.key === (value ?? current.key)
                    ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                    : "hover:scale-110 hover:ring-1 hover:ring-foreground/30 hover:ring-offset-1 hover:ring-offset-background",
                )}
                title={c.label}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
