import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "./button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface FilterSelectProps {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  renderOption?: (opt: string) => string;
}

const SENTINEL_ALL = "__all__";

export function FilterSelect({ label, value, options, onChange, renderOption }: FilterSelectProps) {
  const display = (opt: string) => renderOption ? renderOption(opt) : opt;
  return (
    <div className="flex items-center gap-1">
      <Select
        value={value ?? SENTINEL_ALL}
        onValueChange={(v) => onChange(v === SENTINEL_ALL ? null : v)}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "h-7 gap-1 rounded-md text-[11px] font-medium whitespace-nowrap",
            value
              ? "bg-accent border-border text-foreground"
              : "bg-background border-input text-muted-foreground",
          )}
        >
          <span className="text-muted-foreground font-semibold">{label}:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={SENTINEL_ALL}>Усі</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {display(opt)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {value && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Скинути фільтр</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
