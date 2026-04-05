import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../hooks/AuthContext";
import { supabase } from "../lib/supabase";
import type { Team } from "../types";

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

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-purple-900">
      <div className="w-[400px] max-w-[90vw] bg-white rounded-2xl px-8 py-9 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-[22px] font-extrabold text-primary-900">
            Performance Dashboard
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {mode === "login" ? "Вхід в систему" : "Створити акаунт"}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-3.5 py-2.5 rounded-lg text-xs mb-4 border-l-[3px] border-red-500">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 px-3.5 py-2.5 rounded-lg text-xs mb-4 border-l-[3px] border-green-500">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <div className="flex gap-2.5 mb-3.5">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Імʼя
                  </label>
                  <input
                    className={inputCls}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Андрій"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Прізвище
                  </label>
                  <input
                    className={inputCls}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Іваненко"
                  />
                </div>
              </div>

              <div className="mb-3.5">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Логін
                </label>
                <input
                  className={inputCls}
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  required
                  placeholder="andrii_iv"
                />
              </div>

              <div className="mb-3.5">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Команда
                </label>
                <select
                  className={clsx(inputCls, "cursor-pointer")}
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">— Без команди —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="mb-3.5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email
            </label>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Пароль
            </label>
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className={clsx(
              "w-full py-3 text-sm font-bold text-white rounded-xl cursor-pointer transition-opacity",
              busy
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-primary-700 to-purple-700 hover:opacity-90",
            )}
          >
            {busy
              ? "Зачекайте…"
              : mode === "login"
                ? "Увійти"
                : "Зареєструватися"}
          </button>
        </form>

        <div className="text-center mt-4.5 text-xs text-gray-500">
          {mode === "login" ? (
            <>
              Немає акаунту?{" "}
              <button
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setSuccess(null);
                }}
                className="bg-transparent border-none text-primary-700 cursor-pointer font-bold text-xs p-0"
              >
                Зареєструватися
              </button>
            </>
          ) : (
            <>
              Вже є акаунт?{" "}
              <button
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccess(null);
                }}
                className="bg-transparent border-none text-primary-700 cursor-pointer font-bold text-xs p-0"
              >
                Увійти
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
