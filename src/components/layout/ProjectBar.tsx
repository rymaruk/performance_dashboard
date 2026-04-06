import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
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
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project } from "../../types";

interface ProjectBarProps {
  projects: Project[];
  activeProjectId: string;
  onSwitch: (id: string) => void;
  onUpdateName: (v: string) => void;
  onUpdateDesc: (v: string) => void;
  onDelete: () => void;
  onAddProject: () => void;
}

export function ProjectBar({
  projects,
  activeProjectId,
  onSwitch,
  onUpdateName,
  onUpdateDesc,
  onDelete,
  onAddProject,
}: ProjectBarProps) {
  const confirm = useConfirmAction();
  const proj = projects.find((p) => p.id === activeProjectId);
  const [open, setOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  function handleOpen() {
    if (proj) {
      setEditName(proj.name);
      setEditDesc(proj.desc);
    }
    setOpen(true);
  }

  function handleSave() {
    onUpdateName(editName);
    onUpdateDesc(editDesc);
    setOpen(false);
  }

  return (
    <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-2 overflow-x-auto">
      {projects.length === 0 && (
        <span className="text-xs text-muted-foreground">
          Немає проектів — додайте перший
        </span>
      )}

      {projects.map((p) => {
        const isActive = p.id === activeProjectId;
        return (
          <HoverCard key={p.id} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                onClick={() => onSwitch(p.id)}
                className="text-left focus:outline-none"
              >
                <Item
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "cursor-pointer rounded-lg px-2 py-1 items-center transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-accent",
                  )}
                >
                  <ItemMedia>
                    <FolderOpen className="size-4" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className={cn("text-xs", isActive && "font-bold")}>
                      {p.name}
                    </ItemTitle>
                  </ItemContent>
                  {isActive && (
                    <ItemActions>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
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
                Цілей: {p.goals.length} · Задач: {p.goals.reduce((a, g) => a + g.tasks.length, 0)}
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      })}

      <Button onClick={onAddProject} size="sm" className="ml-auto shrink-0">
        <Plus className="size-3.5" /> Проект
      </Button>

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
                <Label htmlFor="proj-name">Назва проекту</Label>
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
