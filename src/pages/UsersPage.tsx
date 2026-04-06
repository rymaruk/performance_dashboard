import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";
import { useConfirmAction } from "../hooks/ConfirmContext";
import { DEFAULT_ACCENT, getAccentDef } from "../constants";
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

const SEED_ADMIN_ID = "00000000-0000-0000-0000-000000000001";

function isSeedAdminId(id: string) {
  return id === SEED_ADMIN_ID;
}

export function UsersPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirmAction();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fLogin, setFLogin] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fRole, setFRole] = useState<"admin" | "user">("user");
  const [fTeamId, setFTeamId] = useState("");
  const [fColor, setFColor] = useState<AccentColor>(DEFAULT_ACCENT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [usersRes, teamsRes] = await Promise.all([
      supabase.from("users").select("*, team:teams(*)").order("created_at", { ascending: true }),
      supabase.from("teams").select("*").order("created_at", { ascending: true }),
    ]);
    setUsers((usersRes.data as unknown as UserProfile[]) ?? []);
    setTeams((teamsRes.data as Team[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) {
    navigate("/", { replace: true });
    return null;
  }

  const clearFormFields = () => {
    setFFirstName("");
    setFLastName("");
    setFEmail("");
    setFLogin("");
    setFPassword("");
    setFRole("user");
    setFTeamId("");
    setFColor(DEFAULT_ACCENT);
    setEditingUser(null);
  };

  const cancelForm = () => {
    clearFormFields();
    setShowForm(false);
    setError(null);
  };

  const openCreateForm = () => {
    clearFormFields();
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (u: UserProfile) => {
    setError(null);
    setEditingUser(u);
    setFFirstName(u.first_name);
    setFLastName(u.last_name);
    setFEmail(u.email);
    setFLogin(u.login);
    setFRole(u.role);
    setFTeamId(u.team_id ?? "");
    setFColor(((u.color ?? DEFAULT_ACCENT) as AccentColor) ?? DEFAULT_ACCENT);
    setFPassword("");
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!fEmail.trim() || !fPassword.trim() || !fFirstName.trim() || !fLastName.trim() || !fLogin.trim()) {
      const msg = "Заповніть усі обовʼязкові поля (включно з паролем)";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (fPassword.trim().length < 6) {
      const msg = "Пароль має бути не коротшим за 6 символів";
      setError(msg);
      toast.error(msg);
      return;
    }
    setError(null);
    setSaving(true);
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
      toast.error(signupErr.message);
      setSaving(false);
      return;
    }
    cancelForm();
    setSaving(false);
    toast.success("Користувача створено");
    setTimeout(load, 1000);
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    if (!fEmail.trim() || !fFirstName.trim() || !fLastName.trim() || !fLogin.trim()) {
      const msg = "Заповніть усі обовʼязкові поля";
      setError(msg);
      toast.error(msg);
      return;
    }
    const pw = fPassword.trim();
    if (pw.length > 0 && pw.length < 6) {
      const msg = "Пароль має бути не коротшим за 6 символів";
      setError(msg);
      toast.error(msg);
      return;
    }

    setError(null);
    setSaving(true);

    const payload = {
      target_user_id: editingUser.id,
      p_first_name: fFirstName.trim(),
      p_last_name: fLastName.trim(),
      p_email: fEmail.trim(),
      p_login: fLogin.trim(),
      p_role: isSeedAdminId(editingUser.id) ? "admin" : fRole,
      p_team_id: isSeedAdminId(editingUser.id) ? null : fTeamId || null,
      p_color: fColor,
    };

    const { error: rpcError } = await supabase.rpc("admin_update_user_profile", payload);
    let saveErr = rpcError;

    const missingRpc =
      rpcError &&
      (rpcError.code === "PGRST202" || /could not find the function/i.test(rpcError.message ?? ""));

    if (missingRpc) {
      const { error: fbErr } = await supabase
        .from("users")
        .update({
          first_name: payload.p_first_name,
          last_name: payload.p_last_name,
          email: payload.p_email.toLowerCase(),
          login: payload.p_login,
          role: payload.p_role,
          team_id: payload.p_team_id,
          color: fColor,
        })
        .eq("id", editingUser.id);
      if (fbErr) {
        saveErr = fbErr;
      } else {
        saveErr = null;
        toast.info(
          "Профіль збережено в public.users. Щоб синхронізувати email для входу, виконайте SQL з supabase-admin-update-user-profile-rpc.sql",
          { duration: 6000 },
        );
      }
    }

    if (saveErr) {
      setError(saveErr.message);
      toast.error(saveErr.message);
      setSaving(false);
      return;
    }

    if (pw.length > 0) {
      const { error: pwdErr } = await supabase.rpc("admin_set_user_password", {
        target_user_id: editingUser.id,
        new_password: pw,
      });
      if (pwdErr) {
        const msg = pwdErr.message ?? "";
        const missingFn =
          pwdErr.code === "PGRST202" || /could not find the function/i.test(msg);
        const full = missingFn
          ? `${msg} Якщо SQL уже виконано: Settings → API → перезавантажте кеш схеми.`
          : msg;
        setError(full);
        toast.error(full);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    cancelForm();
    toast.success("Користувача оновлено");
    load();
  };

  const handleDelete = (u: UserProfile, onDeleted?: () => void) => {
    if (isSeedAdminId(u.id)) {
      const msg = "Системний адміністратор не може бути видалений";
      setError(msg);
      toast.error(msg);
      return;
    }
    confirm(`Видалити користувача «${u.first_name} ${u.last_name}» (${u.email})?`, async () => {
      setError(null);
      const { error: e } = await supabase.from("users").delete().eq("id", u.id);
      if (e) {
        setError(e.message);
        toast.error(e.message);
        return;
      }
      toast.success("Користувача видалено");
      onDeleted?.();
      load();
    });
  };

  const editingSeed = editingUser ? isSeedAdminId(editingUser.id) : false;

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
            onClick={() => (showForm ? cancelForm() : openCreateForm())}
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
            <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-0 pt-0 space-y-0">
              <CardTitle className="text-sm">
                {editingUser ? "Редагувати користувача" : "Створити користувача"}
              </CardTitle>
              <div className="flex items-center gap-2 shrink-0">
                <ColorPicker value={fColor} onChange={setFColor} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Логін *</Label>
                  <Input
                    className="text-[13px]"
                    value={fLogin}
                    onChange={(e) => setFLogin(e.target.value)}
                    placeholder="andrii_iv"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">
                    Пароль {editingUser ? "(необовʼязково)" : "*"}
                  </Label>
                  <Input
                    type="password"
                    className="text-[13px]"
                    value={fPassword}
                    onChange={(e) => setFPassword(e.target.value)}
                    placeholder={editingUser ? "залиште порожнім, щоб не змінювати" : "мін. 6 символів"}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Email *</Label>
                <Input
                  type="email"
                  className="text-[13px]"
                  value={fEmail}
                  onChange={(e) => setFEmail(e.target.value)}
                  placeholder="user@example.com"
                  autoComplete="email"
                />
              </div>

              <Separator className="mt-[30px] mb-[30px]" />

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

              <Separator className="mt-[30px] mb-[30px]" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Роль</Label>
                  {editingSeed ? (
                    <Input
                      className="text-[13px] cursor-default bg-muted text-muted-foreground"
                      readOnly
                      tabIndex={-1}
                      value="Адміністратор (system)"
                    />
                  ) : (
                    <Select value={fRole} onValueChange={(v) => setFRole(v as "admin" | "user")}>
                      <SelectTrigger className="w-full text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="user">Користувач</SelectItem>
                          <SelectItem value="admin">Адміністратор</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Команда</Label>
                  {editingSeed ? (
                    <Input
                      className="text-[13px] cursor-default bg-muted text-muted-foreground"
                      readOnly
                      tabIndex={-1}
                      value="—"
                    />
                  ) : (
                    <Select value={fTeamId || "__none__"} onValueChange={(v) => setFTeamId(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="w-full text-[13px]">
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
                  )}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {editingUser && !editingSeed && (
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="size-9 shrink-0"
                    disabled={saving}
                    onClick={() => editingUser && handleDelete(editingUser, cancelForm)}
                    aria-label="Видалити користувача"
                    title="Видалити"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => void (editingUser ? handleUpdate() : handleCreate())}
                  disabled={saving}
                  className="font-semibold min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {editingUser ? "Збереження…" : "Створення…"}
                    </>
                  ) : editingUser ? (
                    "Зберегти"
                  ) : (
                    "Створити"
                  )}
                </Button>
              </div>
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
            <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_120px_160px_minmax(120px,auto)] gap-2 border-b border-border bg-muted/50 px-5 py-2.5 text-[10px] font-bold uppercase text-muted-foreground">
              <span>Користувач</span>
              <span>Email / Логін</span>
              <span>Роль</span>
              <span>Команда</span>
              <span className="text-right">Дії</span>
            </div>

            {users.map((u, i) => (
              <div key={u.id}>
                {i > 0 && <Separator />}
                <div
                  className={cn(
                    "grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_120px_160px_minmax(120px,auto)] items-center gap-2 px-5 py-3",
                    isSeedAdminId(u.id) && "bg-accent/50",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        "size-7 shrink-0 rounded-full border border-border",
                        getAccentDef(u.color).bgLight,
                      )}
                      title={u.color ?? ""}
                    />
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">
                        {u.first_name} {u.last_name}
                        {isSeedAdminId(u.id) && (
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
                    {u.role === "admin" ? (
                      <Badge variant="secondary" className="text-[11px]">
                        Адмін
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px]">
                        Користувач
                      </Badge>
                    )}
                  </div>

                  <div className="text-[11px] text-foreground truncate">
                    {u.team?.name ?? "—"}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1 text-[11px]"
                      onClick={() => openEditForm(u)}
                    >
                      <Pencil className="size-3.5" />
                      Редагувати
                    </Button>
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
