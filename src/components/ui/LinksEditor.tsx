import { Input } from "./input";
import { Button } from "./button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";
import {
  FieldGroup,
  Field,
  FieldLabel,
} from "./field";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { X, ExternalLink } from "lucide-react";
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
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          Посилання
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

      <FieldGroup className="space-y-2">
        {links.map((lk) => (
          <div key={lk.id} className="flex items-end gap-2">
            <Field className="min-w-[80px] max-w-[140px]">
              <FieldLabel
                htmlFor={`link-label-${lk.id}`}
                className="text-[10px] text-muted-foreground"
              >
                Назва
              </FieldLabel>
              <Input
                id={`link-label-${lk.id}`}
                value={lk.label}
                onChange={(e) =>
                  onUpdate(lk.id, { ...lk, label: e.target.value })
                }
                placeholder="Назва"
                className="h-7 text-[11px] font-medium px-2"
              />
            </Field>

            <Field className="flex-1">
              <FieldLabel
                htmlFor={`link-url-${lk.id}`}
                className="text-[10px] text-muted-foreground"
              >
                URL
              </FieldLabel>
              <div className="flex items-center gap-1.5">
                <Input
                  id={`link-url-${lk.id}`}
                  value={lk.url}
                  onChange={(e) =>
                    onUpdate(lk.id, { ...lk, url: e.target.value })
                  }
                  placeholder="https://..."
                  className="h-7 text-[11px] text-primary px-2 flex-1"
                />
                {lk.url && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={lk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex shrink-0"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Відкрити посилання</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </Field>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
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
      </FieldGroup>
    </div>
  );
}
