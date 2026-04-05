import { useNavigate } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import clsx from "clsx";
import { Btn } from "../ui";
import { useAuth } from "../../hooks/AuthContext";

interface HeaderProps {
  onAddProject: () => void;
}

export function Header({ onAddProject }: HeaderProps) {
  const { profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const initials = profile
    ? `${(profile.first_name || "?")[0]}${(profile.last_name || "?")[0]}`.toUpperCase()
    : "?";

  return (
    <div className="bg-gradient-to-r from-primary-900 to-purple-900 text-white px-6 pt-4.5 pb-3.5 flex justify-between items-center flex-wrap gap-2">
      <div>
        <div className="text-lg font-bold">
          Digital Marketing — Project Dashboard
        </div>
        <div className="text-xs opacity-70">
          Цілі · KPI · Задачі · Gantt · Проекти
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Btn onClick={onAddProject} variant="solid" size="sm" className="!bg-green-700 hover:!bg-green-600">
          ＋ Проект
        </Btn>

        <Menu as="div" className="relative">
          <MenuButton
            className={clsx(
              "w-[38px] h-[38px] rounded-full text-white border-2 border-white/50 cursor-pointer",
              "text-sm font-extrabold flex items-center justify-center tracking-wide",
              isAdmin
                ? "bg-gradient-to-br from-purple-700 to-purple-500"
                : "bg-gradient-to-br from-primary-700 to-primary-500",
            )}
            title={
              profile
                ? `${profile.first_name} ${profile.last_name}`
                : "Меню"
            }
          >
            {initials}
          </MenuButton>

          <MenuItems
            transition
            anchor="bottom end"
            className="z-[1000] w-[260px] mt-2 bg-white rounded-xl shadow-2xl overflow-hidden origin-top-right transition data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-150 data-[leave]:duration-100"
          >
            {/* User info card */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-200 flex gap-3 items-center">
              <div
                className={clsx(
                  "w-10 h-10 rounded-full text-white text-[15px] font-extrabold flex items-center justify-center shrink-0",
                  isAdmin
                    ? "bg-gradient-to-br from-purple-700 to-purple-500"
                    : "bg-gradient-to-br from-primary-700 to-primary-500",
                )}
              >
                {initials}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-bold text-gray-900 truncate">
                  {profile?.first_name} {profile?.last_name}
                </div>
                <div className="text-[11px] text-gray-500 truncate">
                  {profile?.email}
                </div>
                <div className="mt-1 flex gap-1 flex-wrap">
                  <span
                    className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      isAdmin
                        ? "bg-purple-50 text-purple-700"
                        : "bg-primary-50 text-primary-700",
                    )}
                  >
                    {isAdmin ? "Адміністратор" : "Користувач"}
                  </span>
                  {!isAdmin && profile?.team && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                      {profile.team.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="py-1">
              {isAdmin && (
                <MenuItem>
                  <button
                    onClick={() => navigate("/teams")}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-800 data-[focus]:bg-gray-100 cursor-pointer"
                  >
                    Команди
                  </button>
                </MenuItem>
              )}
              {isAdmin && (
                <MenuItem>
                  <button
                    onClick={() => navigate("/users")}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-800 data-[focus]:bg-gray-100 cursor-pointer"
                  >
                    Користувачі
                  </button>
                </MenuItem>
              )}
              {isAdmin && (
                <MenuItem>
                  <button
                    onClick={() => navigate("/kpi-manage")}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-800 data-[focus]:bg-gray-100 cursor-pointer"
                  >
                    📈 KPI показники
                  </button>
                </MenuItem>
              )}
              <MenuItem>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-800 data-[focus]:bg-gray-100 cursor-pointer"
                >
                  Профіль
                </button>
              </MenuItem>

              <div className="h-px bg-gray-200 my-1" />

              <MenuItem>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-700 data-[focus]:bg-red-50 cursor-pointer"
                >
                  Вийти
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>
      </div>
    </div>
  );
}
