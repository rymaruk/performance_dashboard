import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";
import { useConfirmAction } from "../hooks/ConfirmContext";
import { getAccentDef, DEFAULT_ACCENT } from "../constants";
import type { AccentColor } from "../constants";
import type { KpiDefinition } from "../types";
import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SidebarPageLayout } from "../components/layout/SidebarPageLayout";

interface GoalUsage {
  goal_id: string;
  goal_title: string;
  project_name: string;
  current_value: number;
  target_value: number;
}

interface KpiWithUsage extends KpiDefinition {
  goals: GoalUsage[];
}

export function KpiManagePage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirmAction();

  const [kpis, setKpis] = useState<KpiWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("%");
  const [newTarget, setNewTarget] = useState("100");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState<AccentColor>(DEFAULT_ACCENT);

  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState<AccentColor>(DEFAULT_ACCENT);

  const load = useCallback(async () => {
    const [defsRes, junctionRes, goalsRes, projRes] = await Promise.all([
      supabase.from("kpi_definitions").select("*").order("name"),
      supabase.from("goal_kpis").select("*"),
      supabase.from("goals").select("id, title, project_id"),
      supabase.from("projects").select("id, name"),
    ]);

    const defs = (defsRes.data as KpiDefinition[]) ?? [];
    const junctions = junctionRes.data ?? [];
    const goals = goalsRes.data ?? [];
    const projects = projRes.data ?? [];

    const projectMap = new Map(projects.map((p: { id: string; name: string }) => [p.id, p.name]));
    const goalMap = new Map(
      goals.map((g: { id: string; title: string; project_id: string }) => [
        g.id,
        { title: g.title, project_name: projectMap.get(g.project_id) ?? "" },
      ]),
    );

    const usageByDef = new Map<string, GoalUsage[]>();
    for (const j of junctions) {
      const goalInfo = goalMap.get(j.goal_id);
      if (!goalInfo) continue;
      const arr = usageByDef.get(j.kpi_definition_id) ?? [];
      arr.push({
        goal_id: j.goal_id,
        goal_title: goalInfo.title,
        project_name: goalInfo.project_name,
        current_value: Number(j.current_value),
        target_value: Number(j.target_value),
      });
      usageByDef.set(j.kpi_definition_id, arr);
    }

    setKpis(
      defs.map((d) => ({
        ...d,
        goals: usageByDef.get(d.id) ?? [],
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) {
    navigate("/", { replace: true });
    return null;
  }

  const handleAdd = async () => {
    const trimName = newName.trim();
    if (!trimName) return;
    setError(null);
    const { error: e } = await supabase.from("kpi_definitions").insert({
      name: trimName,
      unit: newUnit.trim() || "%",
      target_value: Number(newTarget) || 100,
      description: newDesc.trim(),
      color: newColor,
    });
    if (e) {
      setError(e.message.includes("idx_kpi_definitions_name") ? "KPI з такою назвою вже існує" : e.message);
      return;
    }
    setNewName("");
    setNewUnit("%");
    setNewTarget("100");
    setNewDesc("");
    setNewColor(DEFAULT_ACCENT);
    load();
  };

  const handleDelete = (kpi: KpiWithUsage) => {
    confirm(`Видалити KPI «${kpi.name}»?`, async () => {
      setError(null);
      const { error: e } = await supabase.from("kpi_definitions").delete().eq("id", kpi.id);
      if (e) {
        setError(
          e.message.includes("Cannot delete KPI")
            ? `Неможливо видалити «${kpi.name}»: KPI привʼязаний до цілей. Спочатку відʼєднайте його від усіх цілей.`
            : e.message,
        );
        return;
      }
      load();
    });
  };

  const startEdit = (kpi: KpiWithUsage) => {
    setEditingId(kpi.id);
    setEditName(kpi.name);
    setEditUnit(kpi.unit);
    setEditTarget(String(kpi.target_value));
    setEditDesc(kpi.description);
    setEditColor((kpi.color as AccentColor) ?? DEFAULT_ACCENT);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setError(null);
    const targetNum = Number(editTarget) || 100;
    const prev = kpis.find((k) => k.id === editingId);
    const { error: e } = await supabase
      .from("kpi_definitions")
      .update({
        name: editName.trim(),
        unit: editUnit.trim() || "%",
        target_value: targetNum,
        description: editDesc.trim(),
        color: editColor,
      })
      .eq("id", editingId);
    if (e) {
      setError(e.message.includes("idx_kpi_definitions_name") ? "KPI з такою назвою вже існує" : e.message);
      return;
    }

    if (prev && Number(prev.target_value) !== targetNum) {
      const { error: jErr } = await supabase
        .from("goal_kpis")
        .update({ target_value: targetNum })
        .eq("kpi_definition_id", editingId);
      if (jErr) {
        setError(jErr.message);
        return;
      }
    }

    setEditingId(null);
    load();
  };

  const inputInlineClass = "h-8 text-[13px]";

  return (
    <SidebarPageLayout
      title="Управління KPI показниками"
      subtitle="Базовий список KPI, використання у цілях"
    >
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Card className="mb-5 py-5">
          <CardContent className="space-y-3 px-5 pt-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-foreground">Створити новий KPI показник</div>
              <div className="flex items-center gap-2">
                <ColorPicker value={newColor} onChange={setNewColor} />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_80px_80px] gap-2.5 items-end">
              <div className="space-y-1 min-w-0">
                <Label htmlFor="kpi-name" className="text-[11px] text-muted-foreground">Назва *</Label>
                <Input
                  id="kpi-name"
                  className={inputInlineClass}
                  placeholder="Назва KPI"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="kpi-unit" className="text-[11px] text-muted-foreground">Одиниця</Label>
                <Input
                  id="kpi-unit"
                  className={inputInlineClass}
                  placeholder="%"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="kpi-target" className="text-[11px] text-muted-foreground">Ціль</Label>
                <Input
                  id="kpi-target"
                  className={inputInlineClass}
                  placeholder="100"
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="flex-1 space-y-1">
                <Label htmlFor="kpi-desc" className="text-[11px] text-muted-foreground">Опис</Label>
                <Input
                  id="kpi-desc"
                  className="min-h-9 text-[13px]"
                  placeholder="Опис (необовʼязково)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="flex pt-2">

            <Button type="button" onClick={handleAdd} className="shrink-0 gap-1 whitespace-nowrap text-[13px] font-semibold">
                <Plus className="size-4" />
                Створити
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border-l-4 border-destructive bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Завантаження…
          </div>
        ) : kpis.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">KPI показників ще немає</div>
        ) : (
          <div className="space-y-3">
            {kpis.map((kpi) => {
              const isOpen = expandedKpi === kpi.id;
              const isEditing = editingId === kpi.id;

              return (
                <Card key={kpi.id} className="overflow-hidden py-0">
                  <div
                    className="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/50"
                    onClick={() => setExpandedKpi(isOpen ? null : kpi.id)}
                  >
                    <ChevronRight
                      className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                    />

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <ColorPicker value={editColor} onChange={setEditColor} size="sm" />
                          <Input
                            className="w-48"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                          />
                          <Input className="w-16" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
                          <Input
                            className="w-20"
                            type="number"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                          />
                          <Input
                            className="min-w-[120px] flex-1"
                            placeholder="Опис"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                          />
                          <Button type="button" size="sm" onClick={saveEdit}>
                            Зберегти
                          </Button>
                          <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                            Скасувати
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn("size-3 rounded-full shrink-0", getAccentDef(kpi.color).bg)} />
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {kpi.name}
                              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                                (ціль: {kpi.target_value} {kpi.unit})
                              </span>
                              <span className="ml-2 text-[11px] font-normal text-primary">
                                — {kpi.goals.length} {kpi.goals.length === 1 ? "ціль" : "цілей"}
                              </span>
                            </div>
                            {kpi.description && (
                              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{kpi.description}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button type="button" size="sm" variant="outline" onClick={() => startEdit(kpi)}>
                          Редагувати
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={kpi.goals.length > 0 ? 0 : undefined}>
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                className="size-8 shrink-0"
                                disabled={kpi.goals.length > 0}
                                onClick={() => handleDelete(kpi)}
                                aria-label="Видалити KPI"
                                title="Видалити"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {kpi.goals.length > 0 ? "Спочатку відʼєднайте KPI від усіх цілей" : "Видалити KPI"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>

                  {isOpen && (
                    <>
                      <Separator />
                      <CardContent className="px-5 pb-4 pt-0">
                        {kpi.goals.length === 0 ? (
                          <div className="py-3 text-xs text-muted-foreground">Цей KPI ще не привʼязаний до жодної цілі</div>
                        ) : (
                          <div className="mt-3">
                            <Table className="text-xs">
                              <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                  <TableHead className="h-8 text-[11px] font-semibold">Ціль</TableHead>
                                  <TableHead className="h-8 text-[11px] font-semibold">Проект</TableHead>
                                  <TableHead className="h-8 text-[11px] font-semibold text-right">Поточне</TableHead>
                                  <TableHead className="h-8 text-[11px] font-semibold text-right">Ціль</TableHead>
                                  <TableHead className="h-8 text-[11px] font-semibold text-right">Прогрес</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {kpi.goals.map((g) => {
                                  const pct = g.target_value
                                    ? Math.min(100, Math.round((g.current_value / g.target_value) * 100))
                                    : 0;
                                  return (
                                    <TableRow key={g.goal_id}>
                                      <TableCell className="font-medium text-foreground">{g.goal_title}</TableCell>
                                      <TableCell className="text-muted-foreground">{g.project_name}</TableCell>
                                      <TableCell
                                        className={cn(
                                          "text-right font-bold",
                                          pct >= 100 ? "text-success" : "text-foreground",
                                        )}
                                      >
                                        {g.current_value}
                                      </TableCell>
                                      <TableCell className="text-right text-muted-foreground">
                                        {g.target_value} {kpi.unit}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                            <div
                                              className={cn(
                                                "h-full rounded-full",
                                                pct >= 100 ? "bg-success" : getAccentDef(kpi.color).bg,
                                              )}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                          <span
                                            className={cn(
                                              "text-[11px] font-semibold",
                                              pct >= 100 ? "text-success" : getAccentDef(kpi.color).text,
                                            )}
                                          >
                                            {pct}%
                                          </span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SidebarPageLayout>
  );
}
