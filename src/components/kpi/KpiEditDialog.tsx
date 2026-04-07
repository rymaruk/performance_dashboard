import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Pencil } from "lucide-react";
import type { KPI } from "../../types";

interface KpiEditDialogProps {
  kpi: KPI;
  onSave: (newValue: number, comment: string, newTarget?: number) => void;
}

export function KpiEditDialog({ kpi, onSave }: KpiEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [comment, setComment] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setNewValue(String(kpi.current));
      setNewTarget(String(kpi.target));
      setComment("");
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    const val = Number(newValue);
    const tgt = Number(newTarget);
    if (isNaN(val) || isNaN(tgt)) return;
    onSave(val, comment.trim(), tgt !== kpi.target ? tgt : undefined);
    setOpen(false);
  };

  const canSave =
    newValue !== "" &&
    !isNaN(Number(newValue)) &&
    newTarget !== "" &&
    !isNaN(Number(newTarget)) &&
    comment.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3" />
          Змінити
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Оновити значення KPI</DialogTitle>
          <DialogDescription>
            {kpi.name} ({kpi.unit})
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="text-sm text-muted-foreground">
            Поточне значення:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {kpi.current} {kpi.unit}
            </span>
            <span className="ml-2">
              Ціль:{" "}
              <span className="font-bold text-foreground tabular-nums">
                {kpi.target} {kpi.unit}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="kpi-new-value">Нове значення</Label>
              <Input
                id="kpi-new-value"
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Значення"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kpi-new-target">Ціль</Label>
              <Input
                id="kpi-new-target"
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder="Ціль"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="kpi-comment">
              Коментар <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="kpi-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Чому змінюється значення?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
