import type { LucideIcon } from "lucide-react";
import { BarChart3, ChartGantt, LayoutDashboard, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { NAV_TABS } from "../../constants";
import type { TabKey } from "../../types";

const TAB_ICONS: Record<TabKey, LucideIcon> = {
  dash: LayoutDashboard,
  goals: Target,
  kpi: BarChart3,
  gantt: ChartGantt,
};

interface NavProps {
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
  children: React.ReactNode;
}

export function Nav({ tab, onTabChange, children }: NavProps) {
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => onTabChange(v as TabKey)}
      className="w-full"
    >
      <TabsList className="w-full justify-start rounded-none border-b bg-card h-auto p-0 gap-0">
        {NAV_TABS.map((t) => {
          const Icon = TAB_ICONS[t.k];
          return (
            <TabsTrigger
              key={t.k}
              value={t.k}
              className="group inline-flex items-center gap-2 rounded-none border-b-2 border-transparent px-4.5 py-2.5 text-[13px] data-[state=active]:border-b-primary data-[state=active]:font-bold data-[state=active]:shadow-none"
            >
              <Icon
                className="size-3.5 shrink-0 text-muted-foreground group-data-[state=active]:text-foreground"
                aria-hidden
              />
              {t.l}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {children}
    </Tabs>
  );
}

export { TabsContent };
