import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";
import { useConfirmAction } from "../hooks/ConfirmContext";
import type { Team, TeamStatus, UserProfile } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarPageLayout } from "../components/layout/SidebarPageLayout";

export function TeamsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirmAction();

  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [teamsRes, usersRes] = await Promise.all([
      supabase.from("teams").select("*").order("created_at", { ascending: true }),
      supabase.from("users").select("*, team:teams(*)").order("created_at", { ascending: true }),
    ]);
    setTeams((teamsRes.data as Team[]) ?? []);
    setAllUsers((usersRes.data as unknown as UserProfile[]) ?? []);
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
    if (!newName.trim()) return;
    setError(null);
    const { error: e } = await supabase.from("teams").insert({ name: newName.trim(), status: "active" });
    if (e) {
      setError(e.message);
      return;
    }
    setNewName("");
    load();
  };

  const toggleStatus = async (team: Team) => {
    const next: TeamStatus = team.status === "active" ? "suspended" : "active";
    await supabase.from("teams").update({ status: next }).eq("id", team.id);
    load();
  };

  const handleDelete = (team: Team) => {
    confirm(`Видалити команду «${team.name}»?`, async () => {
      setError(null);
      const { error: e } = await supabase.from("teams").delete().eq("id", team.id);
      if (e) {
        setError(
          e.message.includes("Cannot delete team")
            ? `Неможливо видалити «${team.name}»: до команди привʼязані цілі.`
            : e.message,
        );
        return;
      }
      load();
    });
  };

  const addUserToTeam = async (userId: string, teamId: string) => {
    await supabase.from("users").update({ team_id: teamId }).eq("id", userId);
    load();
  };

  const removeUserFromTeam = async (userId: string) => {
    await supabase.from("users").update({ team_id: null }).eq("id", userId);
    load();
  };

  const teamMembers = (teamId: string) => allUsers.filter((u) => u.team_id === teamId);
  const availableUsers = (teamId: string) =>
    allUsers.filter((u) => u.team_id !== teamId && u.id !== "00000000-0000-0000-0000-000000000001");

  return (
    <SidebarPageLayout
      title="Управління командами"
      subtitle="Створення, редагування, учасники команд"
    >
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Card className="mb-5 py-5">
          <CardHeader className="px-5 pb-0 pt-0">
            <CardTitle className="text-sm">Додати нову команду</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pt-3">
            <div className="flex gap-2.5 items-end">
              <div className="flex-1 space-y-1">
                <Label htmlFor="team-name" className="text-[11px] text-muted-foreground">Назва команди</Label>
                <Input
                  id="team-name"
                  className="text-[13px]"
                  placeholder="Назва команди"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <Button type="button" onClick={handleAdd} className="shrink-0 gap-1 text-[13px] font-semibold">
                <Plus className="size-4" />
                Додати
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
        ) : teams.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">Команд ще немає</div>
        ) : (
          teams.map((t) => {
            const isOpen = expandedTeam === t.id;
            const members = teamMembers(t.id);
            const available = availableUsers(t.id);

            return (
              <Card
                key={t.id}
                className={cn("mb-3 overflow-hidden py-0", t.status === "suspended" && "opacity-70")}
              >
                <div
                  className="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/50"
                  onClick={() => setExpandedTeam(isOpen ? null : t.id)}
                >
                  <ChevronRight
                    className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">
                      {t.name}
                      <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                        ({members.length} {members.length === 1 ? "учасник" : "учасників"})
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      Створено: {new Date(t.created_at).toLocaleDateString("uk-UA")}
                    </div>
                  </div>

                  <Badge
                    variant={t.status === "active" ? "success" : "warning"}
                    className="shrink-0 text-[11px]"
                  >
                    {t.status === "active" ? "Активна" : "Призупинена"}
                  </Badge>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-[11px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(t);
                    }}
                  >
                    {t.status === "active" ? "Призупинити" : "Активувати"}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="shrink-0 gap-1 text-[11px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(t);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Видалити
                  </Button>
                </div>

                {isOpen && (
                  <>
                    <Separator />
                    <CardContent className="px-5 pb-4 pt-0">
                      <div className="flex items-center gap-2.5 py-3">
                        <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Додати учасника:</Label>
                        <Select onValueChange={(userId) => addUserToTeam(userId, t.id)}>
                          <SelectTrigger className="flex-1 max-w-[300px] text-xs">
                            <SelectValue placeholder="— Обрати користувача —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {available.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.first_name} {u.last_name} ({u.email})
                                  {u.team_id ? " [вже в іншій команді]" : ""}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      {members.length === 0 ? (
                        <div className="py-2 text-xs text-muted-foreground">Немає учасників</div>
                      ) : (
                        members.map((u, i) => (
                          <div key={u.id}>
                            {i > 0 && <Separator className="my-0" />}
                            <div className="flex items-center gap-2.5 py-2">
                              <Avatar className="size-7 shrink-0">
                                <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
                                  {(u.first_name || "?")[0]}
                                  {(u.last_name || "?")[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="text-[13px] font-semibold text-foreground">
                                  {u.first_name} {u.last_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">{u.email}</div>
                              </div>
                              <Badge
                                variant={u.role === "admin" ? "secondary" : "outline"}
                                className="shrink-0 text-[10px]"
                              >
                                {u.role === "admin" ? "Адмін" : "Юзер"}
                              </Badge>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-7 shrink-0 px-2 text-[10px]"
                                onClick={() => removeUserFromTeam(u.id)}
                              >
                                Прибрати
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })
        )}
      </div>
    </SidebarPageLayout>
  );
}
