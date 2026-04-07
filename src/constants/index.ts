export type AccentColor =
  | "rose"
  | "orange"
  | "amber"
  | "emerald"
  | "teal"
  | "sky"
  | "indigo"
  | "violet"
  | "fuchsia"
  | "slate";

export interface AccentColorDef {
  key: AccentColor;
  label: string;
  bg: string;
  bgLight: string;
  text: string;
  border: string;
  hex: string;
}

export const ACCENT_COLORS: AccentColorDef[] = [
  { key: "rose",    label: "Троянда",    bg: "bg-rose-500",    bgLight: "bg-rose-500/10",    text: "text-rose-500",    border: "border-rose-500",    hex: "#f43f5e" },
  { key: "orange",  label: "Помаранч",   bg: "bg-orange-500",  bgLight: "bg-orange-500/10",  text: "text-orange-500",  border: "border-orange-500",  hex: "#f97316" },
  { key: "amber",   label: "Бурштин",    bg: "bg-amber-500",   bgLight: "bg-amber-500/10",   text: "text-amber-500",   border: "border-amber-500",   hex: "#f59e0b" },
  { key: "emerald", label: "Смарагд",    bg: "bg-emerald-500", bgLight: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500", hex: "#10b981" },
  { key: "teal",    label: "Бірюза",     bg: "bg-teal-500",    bgLight: "bg-teal-500/10",    text: "text-teal-500",    border: "border-teal-500",    hex: "#14b8a6" },
  { key: "sky",     label: "Небо",       bg: "bg-sky-500",     bgLight: "bg-sky-500/10",     text: "text-sky-500",     border: "border-sky-500",     hex: "#0ea5e9" },
  { key: "indigo",  label: "Індиго",     bg: "bg-indigo-500",  bgLight: "bg-indigo-500/10",  text: "text-indigo-500",  border: "border-indigo-500",  hex: "#6366f1" },
  { key: "violet",  label: "Фіолет",     bg: "bg-violet-500",  bgLight: "bg-violet-500/10",  text: "text-violet-500",  border: "border-violet-500",  hex: "#8b5cf6" },
  { key: "fuchsia", label: "Фуксія",     bg: "bg-fuchsia-500", bgLight: "bg-fuchsia-500/10", text: "text-fuchsia-500", border: "border-fuchsia-500", hex: "#d946ef" },
  { key: "slate",   label: "Сланець",    bg: "bg-slate-500",   bgLight: "bg-slate-500/10",   text: "text-slate-500",   border: "border-slate-500",   hex: "#64748b" },
];

export const DEFAULT_ACCENT: AccentColor = "sky";

export function getAccentDef(color?: AccentColor | string | null): AccentColorDef {
  return ACCENT_COLORS.find((c) => c.key === color) ?? ACCENT_COLORS.find((c) => c.key === DEFAULT_ACCENT)!;
}

export const PRIO = [
  "🔴 Критичний",
  "🟠 Високий",
  "🟡 Середній",
  "🟢 Низький",
] as const;

export const STAT = [
  "Планується",
  "В процесі",
  "На ревʼю",
  "Завершено",
  "Заблоковано",
] as const;

export const ROLES = ["SMM", "SEO", "Media Buyer", "Команда"] as const;

export const TASK_ROLES = ["SMM", "SEO", "Media Buyer"] as const;

export const TSTAT = ["To Do", "In Progress", "Done"] as const;

export const GANTT_PX = 900;

export const MONTH_NAMES = [
  "Січ", "Лют", "Бер", "Кві", "Тра", "Чер",
  "Лип", "Сер", "Вер", "Жов", "Лис", "Гру",
] as const;

export const NAV_TABS = [
  { k: "dash",  l: "Дашборд" },
  { k: "goals", l: "Цілі" },
  { k: "kpi",   l: "KPI" },
  { k: "gantt", l: "Gantt" },
  { k: "api-integration", l: "API інтеграції" },
] as const;
