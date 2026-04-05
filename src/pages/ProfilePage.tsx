import { useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/AuthContext";

export function ProfilePage() {
  const { profile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("users")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow";
  const readonlyCls =
    "w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-default outline-none";

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-900 to-purple-900 text-white px-6 pt-4.5 pb-3.5 flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-lg font-bold">Профіль</div>
          <div className="text-xs opacity-70">
            {profile.first_name} {profile.last_name}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/")}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-white/15 border border-white/30 rounded-lg cursor-pointer hover:bg-white/25 transition-colors"
          >
            ← Назад
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-red-700 border-none rounded-lg cursor-pointer hover:bg-red-600 transition-colors"
          >
            Вийти
          </button>
        </div>
      </div>

      <div className="max-w-[500px] mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl px-6 py-7 shadow-sm">
          {/* Role badge */}
          <div className="flex justify-center mb-5">
            <span
              className={clsx(
                "px-5 py-1.5 rounded-full text-[13px] font-bold border",
                profile.role === "admin"
                  ? "bg-purple-50 text-purple-700 border-purple-500"
                  : "bg-primary-50 text-primary-700 border-primary-500",
              )}
            >
              {profile.role === "admin" ? "Адміністратор" : "Користувач"}
            </span>
          </div>

          {/* Editable fields */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Імʼя
              </label>
              <input
                className={inputCls}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
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
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email
            </label>
            <input className={readonlyCls} value={profile.email} readOnly />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Логін
            </label>
            <input className={readonlyCls} value={profile.login} readOnly />
          </div>

          {profile.role === "user" && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Команда
              </label>
              <input
                className={readonlyCls}
                value={profile.team?.name ?? "Не призначено"}
                readOnly
              />
            </div>
          )}

          <div className="flex gap-2.5 items-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                "px-6 py-2.5 text-[13px] font-bold text-white rounded-lg cursor-pointer transition-colors",
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary-700 hover:bg-primary-600",
              )}
            >
              {saving ? "Збереження…" : "Зберегти"}
            </button>
            {saved && (
              <span className="text-xs text-green-700 font-semibold">
                Збережено!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
