import { useState, useEffect } from "react";
import { ChevronDown, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarPageLayout } from "../components/layout/SidebarPageLayout";

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setEmail(profile.email);
  }, [profile]);

  if (!profile) return null;

  const handleSave = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();
    if (!fn || !ln) {
      toast.error("Вкажіть імʼя та прізвище");
      return;
    }
    if (!em) {
      toast.error("Вкажіть email");
      return;
    }

    setSaving(true);
    setSaved(false);

    if (em !== profile.email) {
      const { error: authErr } = await supabase.auth.updateUser({ email: em });
      if (authErr) {
        toast.error(authErr.message);
        setSaving(false);
        return;
      }
    }

    const { error: dbErr } = await supabase
      .from("users")
      .update({ first_name: fn, last_name: ln, email: em })
      .eq("id", profile.id);

    setSaving(false);
    if (dbErr) {
      toast.error(dbErr.message);
      return;
    }

    await refreshProfile();
    setSaved(true);
    toast.success(em !== profile.email ? "Профіль оновлено. Якщо увімкнено підтвердження email, перевірте пошту." : "Збережено");
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordSave = async () => {
    const p = pwdNew.trim();
    if (p.length < 6) {
      toast.error("Пароль має бути не коротшим за 6 символів");
      return;
    }
    if (p !== pwdConfirm.trim()) {
      toast.error("Паролі не збігаються");
      return;
    }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: p });
    setPwdSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPwdNew("");
    setPwdConfirm("");
    toast.success("Пароль оновлено");
  };

  const readonlyClass = cn(
    "cursor-default bg-muted text-muted-foreground",
    "border-input",
  );

  return (
    <SidebarPageLayout
      title="Профіль"
      subtitle={`${profile.first_name} ${profile.last_name}`}
    >
      <div className="mx-auto max-w-[500px] px-4 py-8">
        <Card className="py-7">
          <CardHeader className="items-center px-6 pb-2 pt-0 text-center">
            <Badge
              variant={profile.role === "admin" ? "secondary" : "outline"}
              className="px-5 py-1.5 text-[13px] font-bold"
            >
              {profile.role === "admin" ? "Адміністратор" : "Користувач"}
            </Badge>
            <CardTitle className="sr-only">Редагування профілю</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Імʼя</Label>
                <Input className="text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Прізвище</Label>
                <Input className="text-sm" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-xs text-muted-foreground">
                Email
              </Label>
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                className="text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Логін</Label>
              <Input className={cn("text-sm", readonlyClass)} value={profile.login} readOnly tabIndex={-1} />
            </div>

            {profile.role === "user" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Команда</Label>
                <Input
                  className={cn("text-sm", readonlyClass)}
                  value={profile.team?.name ?? "Не призначено"}
                  readOnly
                  tabIndex={-1}
                />
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPwdOpen((o) => !o)}
                aria-expanded={pwdOpen}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-left text-sm font-semibold",
                  "outline-none transition-colors hover:bg-muted/70",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">Пароль</span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    pwdOpen && "rotate-180",
                  )}
                />
              </button>
              {pwdOpen && (
                <div className="space-y-3 rounded-md border border-border/80 bg-muted/20 px-3 py-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-pwd-new" className="text-xs text-muted-foreground">
                      Новий пароль
                    </Label>
                    <Input
                      id="profile-pwd-new"
                      type="password"
                      autoComplete="new-password"
                      className="text-sm bg-background"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      placeholder="мін. 6 символів"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-pwd-confirm" className="text-xs text-muted-foreground">
                      Підтвердження
                    </Label>
                    <Input
                      id="profile-pwd-confirm"
                      type="password"
                      autoComplete="new-password"
                      className="text-sm bg-background"
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      placeholder="повторіть пароль"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="font-semibold w-full sm:w-auto"
                    onClick={() => void handlePasswordSave()}
                    disabled={pwdSaving}
                  >
                    {pwdSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Збереження…
                      </>
                    ) : (
                      "Оновити пароль"
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button type="button" onClick={() => void handleSave()} disabled={saving} className="font-semibold">
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Збереження…
                  </>
                ) : (
                  "Зберегти"
                )}
              </Button>
              {saved && <span className="text-xs font-semibold text-success">Збережено!</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarPageLayout>
  );
}
