import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarPageLayout } from "../components/layout/SidebarPageLayout";

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await supabase.from("users").update({ first_name: firstName, last_name: lastName }).eq("id", profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input className={cn("text-sm", readonlyClass)} value={profile.email} readOnly tabIndex={-1} />
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

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button type="button" onClick={handleSave} disabled={saving} className="font-semibold">
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
