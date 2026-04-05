import { useState, useRef, type ElementType } from "react";
import { CustomSelect } from "./CustomSelect";
import clsx from "clsx";

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
      <>
        <Tag
          ref={labelRef}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className={clsx(
            "cursor-pointer border-b border-dashed border-primary-500 min-w-[20px] inline-block",
            className,
          )}
        >
          {String(value)}
        </Tag>
        <CustomSelect
          value={String(value)}
          options={options}
          triggerRef={labelRef}
          onSelect={(val) => {
            setV(val);
            onChange(val);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      </>
    );
  }

  if (editing) {
    return (
      <input
        type={type}
        value={String(v)}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setV(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
        }}
        className={clsx(
          "border border-primary-500 rounded bg-primary-50 px-1.5 py-0.5 outline-none text-inherit font-inherit",
          type === "number" ? "w-[70px]" : "w-full",
          className,
        )}
      />
    );
  }

  return (
    <Tag
      ref={options ? labelRef : undefined}
      className={clsx(
        "cursor-pointer border-b border-dashed border-gray-300 min-w-[20px] inline-block hover:border-primary-500 transition-colors",
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
        <span className="text-gray-400">{placeholder}</span>
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
      <textarea
        value={v}
        autoFocus
        rows={3}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          onChange(v);
          setEditing(false);
        }}
        className="w-full border border-primary-500 rounded bg-primary-50 px-1.5 py-1 outline-none text-xs font-inherit resize-y"
      />
    );
  }

  return (
    <div
      className={clsx(
        "cursor-pointer border-b border-dashed border-gray-300 text-xs min-h-[20px] whitespace-pre-wrap leading-relaxed hover:border-primary-500 transition-colors",
        value ? "text-gray-700" : "text-gray-400",
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
