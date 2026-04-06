import { useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  UserCog,
  BarChart3,
  User,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../../hooks/AuthContext";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "../ui/sidebar";

const adminNav = [
  { label: "Команди", href: "/teams", icon: Users },
  { label: "Користувачі", href: "/users", icon: UserCog },
  { label: "KPI показники", href: "/kpi-manage", icon: BarChart3 },
];

const userNav = [
  { label: "Профіль", href: "/profile", icon: User },
];

export function AppSidebar() {
  const { profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = profile
    ? `${(profile.first_name || "?")[0]}${(profile.last_name || "?")[0]}`.toUpperCase()
    : "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              isActive={location.pathname === "/"}
              tooltip="Дашборд"
              onClick={() => navigate("/")}
              className="cursor-pointer"
            >
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <LayoutDashboard className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">Dashboard</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  Project Manager
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Адміністрування</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.href}
                      tooltip={item.label}
                      onClick={() => navigate(item.href)}
                      className="cursor-pointer"
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Особисте</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.href}
                    tooltip={item.label}
                    onClick={() => navigate(item.href)}
                    className="cursor-pointer"
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={profile?.email ?? ""} className="cursor-default">
              <Avatar
                className={cn(
                  "size-8 rounded-lg",
                  isAdmin ? "bg-chart-4" : "bg-chart-1",
                )}
              >
                <AvatarFallback
                  className={cn(
                    "rounded-lg text-xs font-extrabold text-primary-foreground",
                    isAdmin ? "bg-chart-4" : "bg-chart-1",
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {profile?.first_name} {profile?.last_name}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {profile?.email}
                </span>
              </div>
              <Badge
                variant={isAdmin ? "info" : "secondary"}
                className="text-[9px] group-data-[collapsible=icon]:hidden"
              >
                {isAdmin ? "Адмін" : "Юзер"}
              </Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Вийти"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="cursor-pointer text-destructive hover:text-destructive"
            >
              <LogOut className="size-4" />
              <span>Вийти</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
