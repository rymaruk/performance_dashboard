import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";
import { useConfirmAction } from "../hooks/ConfirmContext";
import { getAccentDef, DEFAULT_ACCENT } from "../constants";
import type { AccentColor } from "../constants";
import type { UserProfile, Team } from "../types";
import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarPageLayout } from "../components/layout/SidebarPageLayout";

interface ProjectRow {
  id: string;
  name: string;
}

export function UsersPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirmAction();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [_projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fLogin, setFLogin] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fRole, setFRole] = useState<"admin" | "user">("user");
  const [fTeamId, setFTeamId] = useState("");
  const [fColor, setFColor] = useState<AccentColor>(DEFAULT_ACCENT);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [usersRes, teamsRes, projRes] = await Promise.all([
      supabase.from("users").select("*, team:teams(*)").order("created_at", { ascending: true }),
      supabase.from("teams").select("*").order("created_at", { ascending: true }),
      supabase.from("projects").select("id, name").order("created_at", { ascending: true }),
    ]);
    setUsers((usersRes.data as unknown as UserProfile[]) ?? []);
    setTeams((teamsRes.data as Team[]) ?? []);
    setProjects((projRes.data as ProjectRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) {
    navigate("/", { replace: true });
    return null;
  }

  const resetForm = () => {
    setFFirstName("");
    setFLastName("");
    setFEmail("");
    setFLogin("");
    setFPassword("");
    setFRole("user");
    setFTeamId("");
    setFColor(DEFAULT_ACCENT);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!fEmail.trim() || !fPassword.trim() || !fFirstName.trim() || !fLastName.trim() || !fLogin.trim()) {
      setError("Заповніть усі обовʼязкові поля");
      return;
    }
    setError(null);
    setCreating(true);
    const { error: signupErr } = await supabase.auth.signUp({
      email: fEmail.trim(),
      password: fPassword,
      options: {
        data: {
          first_name: fFirstName.trim(),
          last_name: fLastName.trim(),
          login: fLogin.trim(),
          role: fRole,
          team_id: fTeamId || null,
          color: fColor,
        },
      },
    });
    if (signupErr) {
      setError(signupErr.message);
      setCreating(false);
      return;
    }
    resetForm();
    setCreating(false);
    setTimeout(load, 1000);
  };

  const handleDelete = (u: UserProfile) => {
    if (u.id === "00000000-0000-0000-0000-000000000001") {
      setError("Системний адміністратор не може бути видалений");
      return;
    }
    confirm(`Видалити користувача «${u.first_name} ${u.last_name}» (${u.email})?`, async () => {
      setError(null);
      const { error: e } = await supabase.from("users").delete().eq("id", u.id);
      if (e) {
        setError(e.message);
        return;
      }
      load();
    });
  };

  const handleRoleChange = async (u: UserProfile, newRole: "admin" | "user") => {
    if (u.id === "00000000-0000-0000-0000-000000000001") return;
    await supabase.from("users").update({ role: newRole }).eq("id", u.id);
    load();
  };

  const handleTeamChange = async (u: UserProfile, newTeamId: string) => {
    await supabase.from("users").update({ team_id: newTeamId || null }).eq("id", u.id);
    load();
  };

  const isSeedAdmin = (id: string) => id === "00000000-0000-0000-0000-000000000001";

  return (
    <SidebarPageLayout
      title="Користувачі"
      subtitle="Управління обліковими записами"
    >
      <div className="mx-auto max-w-[900px] px-4 py-6">
        <div className="mb-5 flex justify-end">
          <Button
            type="button"
            variant={showForm ? "secondary" : "default"}
            onClick={() => setShowForm((v) => !v)}
            className="gap-1 text-[13px] font-semibold"
          >
            {showForm ? (
              "Скасувати"
            ) : (
              <>
                <Plus className="size-4" />
                Новий користувач
              </>
            )}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-5 py-5">
            <CardHeader className="px-5 pb-0 pt-0">
              <CardTitle className="text-sm">Створити користувача</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Імʼя *</Label>
                  <Input
                    className="text-[13px]"
                    value={fFirstName}
                    onChange={(e) => setFFirstName(e.target.value)}
                    placeholder="Андрій"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Прізвище *</Label>
                  <Input
                    className="text-[13px]"
                    value={fLastName}
                    onChange={(e) => setFLastName(e.target.value)}
                    placeholder="Іваненко"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Email *</Label>
                  <Input
                    type="email"
                    className="text-[13px]"
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Логін *</Label>
                  <Input
                    className="text-[13px]"
                    value={fLogin}
                    onChange={(e) => setFLogin(e.target.value)}
                    placeholder="andrii_iv"
                  />
                </div>
              </div>
              <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Колір</Label>
                  <ColorPicker value={fColor} onChange={setFColor} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Пароль *</Label>
                  <Input
                    type="password"
                    className="text-[13px]"
                    value={fPassword}
                    onChange={(e) => setFPassword(e.target.value)}
                    placeholder="мін. 6 символів"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Роль</Label>
                  <Select value={fRole} onValueChange={(v) => setFRole(v as "admin" | "user")}>
                    <SelectTrigger className="text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="user">Користувач</SelectItem>
                        <SelectItem value="admin">Адміністратор</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Команда</Label>
                  <Select value={fTeamId || "__none__"} onValueChange={(v) => setFTeamId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="__none__">— Без команди —</SelectItem>
                        {teams
                          .filter((t) => t.status === "active")
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" onClick={handleCreate} disabled={creating} className="mt-1 font-semibold">
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Створення…
                  </>
                ) : (
                  "Створити"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

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
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">Користувачів ще немає</div>
        ) : (
          <Card className="overflow-hidden py-0">
            <div className="grid grid-cols-[1fr_1fr_120px_160px_80px] gap-2 border-b border-border bg-muted/50 px-5 py-2.5 text-[10px] font-bold uppercase text-muted-foreground">
              <span>Користувач</span>
              <span>Email / Логін</span>
              <span>Роль</span>
              <span>Команда</span>
              <span />
            </div>

            {users.map((u, i) => (
              <div key={u.id}>
                {i > 0 && <Separator />}
                <div
                  className={cn(
                    "grid grid-cols-[1fr_1fr_120px_160px_80px] items-center gap-2 px-5 py-3",
                    isSeedAdmin(u.id) && "bg-accent/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full shrink-0", getAccentDef(u.color).bg)} />
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">
                        {u.first_name} {u.last_name}
                        {isSeedAdmin(u.id) && (
                          <Badge variant="secondary" className="ml-1.5 align-middle text-[9px] font-bold">
                            SYSTEM
                          </Badge>
                        )}
                      </div>
                      <div className="mt-px text-[10px] text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("uk-UA")}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-foreground">{u.email}</div>
                    <div className="text-[10px] text-muted-foreground">@{u.login}</div>
                  </div>

                  <div>
                    {isSeedAdmin(u.id) ? (
                      <Badge variant="secondary" className="text-[11px]">
                        Адмін
                      </Badge>
                    ) : (
                      <Select
                        value={u.role}
                        onValueChange={(v) => handleRoleChange(u, v as "admin" | "user")}
                      >
                        <SelectTrigger size="sm" className="h-7 max-w-[130px] text-[11px] font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="user">Користувач</SelectItem>
                            <SelectItem value="admin">Адмін</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    {isSeedAdmin(u.id) ? (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    ) : (
                      <Select
                        value={u.team_id ?? "__none__"}
                        onValueChange={(v) => handleTeamChange(u, v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger size="sm" className="h-7 max-w-[150px] text-[11px] font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="__none__">— Немає —</SelectItem>
                            {teams
                              .filter((t) => t.status === "active")
                              .map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="text-right">
                    {!isSeedAdmin(u.id) && (
                      <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(u)}>
                        Видалити
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </SidebarPageLayout>
  );
}
