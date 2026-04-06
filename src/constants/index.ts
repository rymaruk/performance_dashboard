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
] as const;
