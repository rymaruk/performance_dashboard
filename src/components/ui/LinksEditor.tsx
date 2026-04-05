import { Editable } from "./Editable";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import type { Link } from "../../types";

interface LinksEditorProps {
  links: Link[];
  onAdd: () => void;
  onRemove: (lid: string) => void;
  onUpdate: (lid: string, lk: Link) => void;
}

export function LinksEditor({ links, onAdd, onRemove, onUpdate }: LinksEditorProps) {
  const confirm = useConfirmAction();
  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] font-semibold text-gray-600">🔗 Посилання</span>
        <button
          onClick={onAdd}
          className="bg-transparent border border-dashed border-gray-400 rounded px-2 py-px text-[11px] cursor-pointer text-primary-700 hover:border-primary-500 transition-colors"
        >
          + додати
        </button>
      </div>

      {links.map((lk) => (
        <div key={lk.id} className="flex gap-1.5 items-center mb-0.5">
          <Editable
            value={lk.label}
            onChange={(v) => onUpdate(lk.id, { ...lk, label: String(v) })}
            className="text-[11px] font-medium min-w-[80px]"
            placeholder="Назва"
          />
          <Editable
            value={lk.url}
            onChange={(v) => onUpdate(lk.id, { ...lk, url: String(v) })}
            className="text-[11px] text-primary-700 flex-1 break-all"
            placeholder="https://..."
          />
          {lk.url && (
            <a
              href={lk.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary-500 hover:text-primary-700"
            >
              ↗
            </a>
          )}
          <button
            onClick={() =>
              confirm(
                `Видалити посилання «${lk.label || lk.url || "без назви"}»?`,
                () => onRemove(lk.id),
              )
            }
            className="bg-transparent border-none cursor-pointer text-red-500 text-xs px-1.5 py-0.5 leading-none hover:text-red-700"
            title="Видалити посилання"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
