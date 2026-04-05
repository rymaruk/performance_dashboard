import clsx from "clsx";
import { NAV_TABS } from "../../constants";
import type { TabKey } from "../../types";

interface NavProps {
  tab: TabKey;
  onTabChange: (t: TabKey) => void;
}

export function Nav({ tab, onTabChange }: NavProps) {
  return (
    <nav className="flex bg-white border-b-2 border-gray-200 overflow-x-auto">
      {NAV_TABS.map((t) => (
        <button
          key={t.k}
          onClick={() => onTabChange(t.k as TabKey)}
          className={clsx(
            "px-4.5 py-2.5 text-[13px] bg-transparent border-none border-b-[3px] cursor-pointer whitespace-nowrap transition-colors",
            tab === t.k
              ? "font-bold text-primary-700 border-b-primary-700"
              : "font-medium text-gray-600 border-b-transparent hover:text-gray-800",
          )}
        >
          {t.l}
        </button>
      ))}
    </nav>
  );
}
