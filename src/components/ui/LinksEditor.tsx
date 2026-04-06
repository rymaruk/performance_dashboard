import { Editable } from "./Editable";
import { Button } from "./button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { X, ExternalLink, Link as LinkIcon } from "lucide-react";
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
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <LinkIcon className="size-3" /> Посилання
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="h-6 px-2 text-[11px] border-dashed"
        >
          + додати
        </Button>
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
            className="text-[11px] text-primary flex-1 break-all"
            placeholder="https://..."
          />
          {lk.url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={lk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex"
                >
                  <ExternalLink className="size-3" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Відкрити посилання</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                onClick={() =>
                  confirm(
                    `Видалити посилання «${lk.label || lk.url || "без назви"}»?`,
                    () => onRemove(lk.id),
                  )
                }
              >
                <X className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Видалити посилання</TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
