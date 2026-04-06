import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../hooks/AuthContext";
import { supabase } from "../lib/supabase";
import type { Team } from "../types";

const NO_TEAM_VALUE = "__none__";

type Mode = "login" | "register";

export function LoginPage() {
  const { login, register, session } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loginName, setLoginName] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  useEffect(() => {
    supabase
      .from("teams")
      .select("*")
      .eq("status", "active")
      .then(({ data }) => {
        if (data) setTeams(data as Team[]);
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);

    if (mode === "login") {
      const err = await login(email, password);
      if (err) setError(err);
    } else {
      const err = await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        login: loginName,
        role: "user",
        team_id: teamId || null,
      });
      if (err) {
        setError(err);
      } else {
        setSuccess("Реєстрація успішна! Перевірте email для підтвердження.");
        setMode("login");
      }
    }
    setBusy(false);
  };

  const fieldLabelCls = "text-xs font-semibold text-muted-foreground";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <Card className="w-full max-w-[400px] border-input shadow-lg">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-[22px] font-extrabold tracking-tight">
            Performance Dashboard
          </CardTitle>
          <CardDescription>
            {mode === "login" ? "Вхід в систему" : "Створити акаунт"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div
              className={cn(
                "rounded-lg border border-destructive/20 px-3.5 py-2.5 text-xs",
                "bg-destructive/10 text-destructive",
              )}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className={cn(
                "rounded-lg border border-success/20 px-3.5 py-2.5 text-xs",
                "bg-success/10 text-success",
              )}
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "register" && (
              <>
                <div className="flex gap-2.5">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="firstName" className={fieldLabelCls}>
                      Імʼя
                    </Label>
                    <Input
                      id="firstName"
                      className="border-input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder="Андрій"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="lastName" className={fieldLabelCls}>
                      Прізвище
                    </Label>
                    <Input
                      id="lastName"
                      className="border-input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="Іваненко"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="loginName" className={fieldLabelCls}>
                    Логін
                  </Label>
                  <Input
                    id="loginName"
                    className="border-input"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    required
                    placeholder="andrii_iv"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="team" className={fieldLabelCls}>
                    Команда
                  </Label>
                  <Select
                    value={teamId || NO_TEAM_VALUE}
                    onValueChange={(v) =>
                      setTeamId(v === NO_TEAM_VALUE ? "" : v)
                    }
                  >
                    <SelectTrigger
                      id="team"
                      className="w-full border-input"
                    >
                      <SelectValue placeholder="Оберіть команду" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TEAM_VALUE}>
                        — Без команди —
                      </SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label htmlFor="email" className={fieldLabelCls}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                className="border-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className={fieldLabelCls}>
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                className="border-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Зачекайте…
                </>
              ) : mode === "login" ? (
                "Увійти"
              ) : (
                "Зареєструватися"
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-1">
            {mode === "login" ? (
              <>
                Немає акаунту?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs font-bold text-primary"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Зареєструватися
                </Button>
              </>
            ) : (
              <>
                Вже є акаунт?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs font-bold text-primary"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Увійти
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
