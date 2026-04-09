import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Loader2, TriangleAlert } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/AuthContext";

interface DeleteProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onConfirmDelete: () => void;
}

export function DeleteProjectModal({
  open,
  onOpenChange,
  projectName,
  onConfirmDelete,
}: DeleteProjectModalProps) {
  const { profile } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const expectedPhrase = `видалити проект ${projectName}`.toLowerCase();
  const isPhraseMatch = inputValue.trim().toLowerCase() === expectedPhrase;
  const canSubmit = isPhraseMatch && password.length > 0 && !loading;

  function reset() {
    setInputValue("");
    setPassword("");
    setPasswordError("");
    setLoading(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleDelete() {
    if (!canSubmit || !profile?.email) return;

    setPasswordError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (error) {
      setLoading(false);
      setPasswordError("Невірний пароль");
      return;
    }

    setLoading(false);
    reset();
    onConfirmDelete();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-5" />
            Видалення проекту
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Ви збираєтесь видалити проект{" "}
            <strong className="text-foreground">«{projectName}»</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Цю дію неможливо скасувати. Усі KPI, метрики та пов'язані дані проекту
          будуть <strong>безповоротно видалені</strong>.
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="delete-confirm-input">
              Для підтвердження введіть{" "}
              <span className="font-mono text-xs font-semibold text-foreground">
                видалити проект {projectName}
              </span>
            </Label>
            <Input
              id="delete-confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`видалити проект ${projectName}`}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="delete-confirm-password">Поточний пароль</Label>
            <Input
              id="delete-confirm-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              placeholder="Введіть ваш пароль"
              autoComplete="current-password"
            />
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Скасувати
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit}
            onClick={handleDelete}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Видалити проект
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
