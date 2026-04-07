import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useAuth } from "../../hooks/AuthContext";
import {
  Users,
  UserCog,
  BarChart3,
  User,
  LogOut,
} from "lucide-react";
import { ModeToggle } from "../ui/mode-toggle";

export function Header() {
  const { profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const initials = profile
    ? `${(profile.first_name || "?")[0]}${(profile.last_name || "?")[0]}`.toUpperCase()
    : "?";

  return (
    <header className="border-b bg-card px-6 py-4 flex justify-between items-center flex-wrap gap-2">
      <div>
        <h1 className="text-lg font-bold text-foreground">
          Performance Dashboard - Digital Marketing
        </h1>
        <p className="text-xs text-muted-foreground">
          Цілі · KPI · Задачі · Gantt · Проекти
        </p>
      </div>

      <div className="flex gap-2 items-center">
        <ModeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full p-0 outline-none">
              <Avatar
                className={cn(
                  "size-[38px] border-2 border-border",
                  isAdmin ? "bg-chart-4" : "bg-chart-1",
                )}
              >
                <AvatarFallback
                  className={cn(
                    "text-sm font-extrabold text-primary-foreground",
                    isAdmin ? "bg-chart-4" : "bg-chart-1",
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[260px]">
            <div className="px-3 pt-3 pb-2 flex gap-3 items-center">
              <Avatar
                className={cn(
                  "size-10",
                  isAdmin ? "bg-chart-4" : "bg-chart-1",
                )}
              >
                <AvatarFallback
                  className={cn(
                    "text-[15px] font-extrabold text-primary-foreground",
                    isAdmin ? "bg-chart-4" : "bg-chart-1",
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <div className="text-sm font-bold truncate">
                  {profile?.first_name} {profile?.last_name}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {profile?.email}
                </div>
                <div className="mt-1 flex gap-1 flex-wrap">
                  <Badge variant={isAdmin ? "info" : "secondary"} className="text-[10px]">
                    {isAdmin ? "Адміністратор" : "Користувач"}
                  </Badge>
                  {!isAdmin && profile?.team && (
                    <Badge variant="success" className="text-[10px]">
                      {profile.team.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/teams")}>
                <Users className="size-4" /> Команди
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/users")}>
                <UserCog className="size-4" /> Користувачі
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/kpi-manage")}>
                <BarChart3 className="size-4" /> KPI показники
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="size-4" /> Профіль
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              <LogOut className="size-4" /> Вийти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
