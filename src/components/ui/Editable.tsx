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
}

export function Editable({
  value,
  onChange,
  tag,
  className = "",
  type = "text",
  options,
  placeholder = "...",
}: EditableProps) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState<string | number>(value);
  const labelRef = useRef<HTMLSpanElement>(null);
  const Tag = (tag || "span") as ElementType;

  const save = () => {
    onChange(type === "number" ? parseFloat(String(v)) || 0 : v);
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
    return (
      <Input
        type={type}
        value={String(v)}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setV(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
        }}
        className={cn(
          "h-auto border-ring bg-accent px-1.5 py-0.5 text-inherit",
          type === "number" ? "w-[70px]" : "w-full",
          className,
        )}
      />
    );
  }

  return (
    <Tag
      ref={options ? labelRef : undefined}
      className={cn(
        "cursor-pointer border-b border-dashed border-border min-w-[20px] inline-block hover:border-primary transition-colors",
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
