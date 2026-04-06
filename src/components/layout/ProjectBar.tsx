import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { ColorPicker } from "../ui/color-picker";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
  ItemMedia,
} from "../ui/item";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import { getAccentDef } from "../../constants";
import type { AccentColor } from "../../constants";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project } from "../../types";

interface ProjectBarProps {
  projects: Project[];
  activeProjectId: string;
  onSwitch: (id: string) => void;
  onSaveProject: (name: string, desc: string, color: string) => void;
  onDelete: () => void;
  onAddProject: () => void;
  /** When false, user only switches projects; no create/edit/delete UI. */
  isAdmin?: boolean;
}

export function ProjectBar({
  projects,
  activeProjectId,
  onSwitch,
  onSaveProject,
  onDelete,
  onAddProject,
  isAdmin = true,
}: ProjectBarProps) {
  const confirm = useConfirmAction();
  const proj = projects.find((p) => p.id === activeProjectId);
  const [open, setOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState<AccentColor | string>("sky");

  function handleOpen() {
    if (proj) {
      setEditName(proj.name);
      setEditDesc(proj.desc);
      setEditColor(proj.color ?? "sky");
    }
    setOpen(true);
  }

  function handleSave() {
    onSaveProject(editName, editDesc, String(editColor));
    setOpen(false);
  }

  return (
    <div className="bg-card border-b border-border px-4 py-2 flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:thin]">
        {projects.length === 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {isAdmin
              ? "Немає проектів — додайте перший"
              : "Немає проектів із вашими призначеними задачами"}
          </span>
        )}

        {projects.map((p) => {
          const isActive = p.id === activeProjectId;
          const pac = getAccentDef(p.color);
          return (
            <div key={p.id} className="shrink-0">
              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSwitch(p.id)}
                    className="max-w-none rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Item
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-max max-w-none cursor-pointer items-center rounded-lg px-2 py-1 transition-colors",
                        isActive
                          ? "text-white shadow-sm"
                          : cn("hover:bg-accent", pac.bgLight),
                      )}
                      style={isActive ? { backgroundColor: pac.hex } : undefined}
                    >
                      <ItemMedia>
                        <FolderOpen className="size-4 shrink-0" />
                      </ItemMedia>
                      <ItemContent className="shrink-0 grow-0 basis-auto">
                        <ItemTitle
                          className={cn(
                            "text-xs whitespace-nowrap",
                            isActive && "font-bold",
                          )}
                        >
                          {p.name}
                        </ItemTitle>
                      </ItemContent>
                      {isActive && isAdmin && (
                        <ItemActions>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-white/70 hover:bg-white/10 hover:text-white"
                            onClick={(e) => { e.stopPropagation(); handleOpen(); }}
                          >
                            <Pencil className="size-3" />
                          </Button>
                        </ItemActions>
                      )}
                    </Item>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="flex w-72 flex-col gap-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {p.desc || "Без опису"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Цілей: {p.goals.length} · Задач:{" "}
                    {p.goals.reduce((a, g) => a + g.tasks.length, 0)}
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <Button onClick={onAddProject} size="sm" className="shrink-0">
          <Plus className="size-3.5" /> Проект
        </Button>
      )}

      {proj && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редагувати проект</DialogTitle>
              <DialogDescription>
                Змініть назву та опис проекту. Натисніть «Зберегти» для підтвердження.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="proj-name">Назва проекту</Label>
                  <ColorPicker
                    value={editColor}
                    onChange={(c: AccentColor) => setEditColor(c)}
                    size="sm"
                  />
                </div>
                <Input
                  id="proj-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Назва проекту"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="proj-desc">Опис</Label>
                <Textarea
                  id="proj-desc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Короткий опис проекту"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              {projects.length > 1 && (
                <Button
                  variant="destructive"
                  className="mr-auto"
                  onClick={() => {
                    setOpen(false);
                    confirm(
                      `Видалити проект «${proj.name || "без назви"}»?`,
                      onDelete,
                    );
                  }}
                >
                  <Trash2 className="size-3.5" /> Видалити
                </Button>
              )}
              <Button variant="outline" onClick={() => setOpen(false)}>
                Скасувати
              </Button>
              <Button onClick={handleSave}>
                Зберегти
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
