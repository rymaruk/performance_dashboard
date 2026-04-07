import { useState, useRef, type ElementType } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Textarea } from "./textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface EditableProps {
  value: string | number;
  onChange: (v: string | number) => void;
  tag?: ElementType;
  className?: string;
  type?: "text" | "number";
  options?: string[];
  placeholder?: string;
  /** Без пунктирної лінії; схоже на інлайн-значення / поле */
  plain?: boolean;
  /** Лише цифри та одна крапка (decimal); ренериться як text + фільтр, не native number */
  numericOnly?: boolean;
}

function sanitizeNumericInput(raw: string): string {
  if (raw === "") return "";
  const noInvalid = raw.replace(/[^\d.]/g, "");
  const dot = noInvalid.indexOf(".");
  if (dot === -1) return noInvalid;
  return noInvalid.slice(0, dot + 1) + noInvalid.slice(dot + 1).replace(/\./g, "");
}

export function Editable({
  value,
  onChange,
  tag,
  className = "",
  type = "text",
  options,
  placeholder = "...",
  plain = false,
  numericOnly = false,
}: EditableProps) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState<string | number>(value);
  const labelRef = useRef<HTMLSpanElement>(null);
  const Tag = (tag || "span") as ElementType;

  const save = () => {
    if (numericOnly) {
      const s = String(v).trim();
      const n = s === "" || s === "." ? 0 : parseFloat(sanitizeNumericInput(s));
      onChange(Number.isFinite(n) ? n : 0);
    } else {
      onChange(type === "number" ? parseFloat(String(v)) || 0 : v);
    }
    setEditing(false);
  };

  if (options && editing) {
    return (
      <Select
        value={String(value)}
        onValueChange={(val) => {
          setV(val);
          onChange(val);
          setEditing(false);
        }}
        open
        onOpenChange={(open) => {
          if (!open) setEditing(false);
        }}
      >
        <SelectTrigger
          size="sm"
          className={cn("h-auto min-h-0 border-primary px-2 py-0.5 text-inherit", className)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }

  if (editing) {
    const useTextNumeric = numericOnly;
    return (
      <Input
        type={useTextNumeric ? "text" : type}
        inputMode={useTextNumeric ? "decimal" : undefined}
        autoComplete="off"
        value={String(v)}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          if (useTextNumeric) {
            setV(sanitizeNumericInput(e.target.value));
          } else {
            setV(e.target.value);
          }
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
        }}
        className={cn(
          plain
            ? "h-auto min-h-0 w-full min-w-[6ch] max-w-full border-input bg-background px-2 py-1 text-inherit shadow-xs md:text-inherit"
            : "h-auto border-ring bg-accent px-1.5 py-0.5 text-inherit",
          !useTextNumeric && type === "number" ? "w-[70px]" : "",
          useTextNumeric && "w-full",
          className,
        )}
      />
    );
  }

  return (
    <Tag
      ref={options ? labelRef : undefined}
      className={cn(
        plain
          ? "cursor-pointer rounded-md border border-transparent px-1.5 py-0.5 -mx-1.5 inline-block min-w-[2ch] max-w-full hover:border-border hover:bg-muted/40 transition-colors"
          : "cursor-pointer border-b border-dashed border-border min-w-[20px] inline-block hover:border-primary transition-colors",
        className,
      )}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setV(value);
        setEditing(true);
      }}
      title="Клік для редагування"
    >
      {value !== undefined && value !== "" && value !== null ? (
        String(value)
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
    </Tag>
  );
}

interface EditableAreaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function EditableArea({
  value,
  onChange,
  placeholder = "Опис...",
}: EditableAreaProps) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);

  if (editing) {
    return (
      <Textarea
        value={v}
        autoFocus
        rows={3}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          onChange(v);
          setEditing(false);
        }}
        className="border-ring bg-accent px-1.5 py-1 text-xs resize-y"
      />
    );
  }

  return (
    <div
      className={cn(
        "cursor-pointer border-b border-dashed border-border text-xs min-h-[20px] whitespace-pre-wrap leading-relaxed hover:border-primary transition-colors",
        value ? "text-foreground" : "text-muted-foreground",
      )}
      onClick={(e) => {
        e.stopPropagation();
        setV(value);
        setEditing(true);
      }}
    >
      {value || placeholder}
    </div>
  );
}
