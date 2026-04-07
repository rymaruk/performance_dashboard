import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { BarChart3, ChartGantt, LayoutDashboard, Target } from "lucide-react";
import { NAV_TABS } from "../../constants";
import type { TabKey } from "../../types";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<TabKey, LucideIcon> = {
  dash: LayoutDashboard,
  goals: Target,
  kpi: BarChart3,
  gantt: ChartGantt,
};

const TAB_KEY_TO_ROUTE: Record<TabKey, string> = {
  dash: "dashboard",
  goals: "goals",
  kpi: "kpi",
  gantt: "gantt",
};

interface NavProps {
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
  projectId: string;
  children: React.ReactNode;
}

export function Nav({ tab, onTabChange, projectId, children }: NavProps) {
  return (
    <div className="w-full">
      <div className="w-full justify-start rounded-none border-b bg-card h-auto p-0 gap-0 flex">
        {NAV_TABS.map((t) => {
          const Icon = TAB_ICONS[t.k];
          const isActive = tab === t.k;
          return (
            <Link
              key={t.k}
              to={`/${projectId}/${TAB_KEY_TO_ROUTE[t.k]}`}
              onClick={(e) => {
                e.preventDefault();
                onTabChange(t.k);
              }}
              className={cn(
                "group inline-flex items-center gap-2 rounded-none border-b-2 border-transparent px-4.5 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                isActive &&
                  "border-b-primary font-bold text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground",
                  isActive && "text-foreground",
                )}
                aria-hidden
              />
              {t.l}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
