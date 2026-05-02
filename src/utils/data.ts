import { today, addDays, diffDays } from "./date";
import type { Link, KPI, Task, Goal, Project } from "../types";

export const uid = (): string => Math.random().toString(36).slice(2, 9);

export const mkLink = (): Link => ({ id: uid(), label: "", url: "" });

export const mkKPI = (): KPI => ({
  id: uid(),
  kpi_definition_id: uid(),
  name: "",
  current: 0,
  target: 100,
  unit: "%",
  color: null,
  status: "В процесі",
});

export const mkTask = (gs: string, _ge: string): Task => ({
  id: uid(),
  title: "",
  desc: "",
  links: [],
  assignee: "SMM",
  user_id: null,
  startDate: gs,
  endDate: addDays(gs, 14),
  status: "To Do",
  color: null,
});

export const mkGoal = (): Goal => {
  const s = today();
  return {
    id: uid(),
    title: "",
    owner: "Команда",
    priority: "🟡 Середній",
    status: "Планується",
    startDate: s,
    endDate: addDays(s, 90),
    color: null,
    kpis: [],
    tasks: [],
  };
};

export const mkProject = (): Project => ({
  id: uid(),
  name: "Новий проект",
  desc: "",
  color: null,
  goals: [],
  createdAt: Date.now(),
});

export function clampTasks(tasks: Task[], gs: string, ge: string): Task[] {
  return tasks.map((t) => {
    let sd = t.startDate;
    let ed = t.endDate;
    const dur = diffDays(sd, ed);
    if (sd < gs) {
      sd = gs;
      ed = addDays(sd, Math.min(dur, diffDays(gs, ge)));
    }
    if (ed > ge) {
      ed = ge;
      sd = addDays(ge, -Math.min(dur, diffDays(gs, ge)));
      if (sd < gs) sd = gs;
    }
    return { ...t, startDate: sd, endDate: ed };
  });
}

export function sampleProject(): Project {
  const p = mkProject();
  p.name = "E-Commerce Brand Launch";
  p.desc = "Розвиток та просування інтернет-магазину";
  const y = "2026";

  p.goals = [
    {
      id: uid(),
      title: "Збільшити впізнаваність бренду",
      owner: "SMM",
      priority: "🔴 Критичний",
      status: "В процесі",
      startDate: `${y}-01-06`,
      endDate: `${y}-09-30`,
      color: null,
      kpis: [
        { id: uid(), kpi_definition_id: uid(), name: "Brand Search Volume", current: 500, target: 2000, unit: "запитів/міс", color: null, status: "В процесі" },
        { id: uid(), kpi_definition_id: uid(), name: "Engagement Rate", current: 1.8, target: 5, unit: "%", color: null, status: "В процесі" },
        { id: uid(), kpi_definition_id: uid(), name: "Підписники", current: 2000, target: 15000, unit: "осіб", color: null, status: "В процесі" },
      ],
      tasks: [
        { id: uid(), title: "Розробити Tone of Voice", desc: "Визначити голос бренду, стиль комунікації", links: [{ id: uid(), label: "ToV guide", url: "https://example.com/tov" }], assignee: "SMM", user_id: null, startDate: `${y}-01-06`, endDate: `${y}-02-14`, status: "Done", color: null },
        { id: uid(), title: "Контент-план на Q1-Q2", desc: "Розробити план публікацій з рубриками", links: [], assignee: "SMM", user_id: null, startDate: `${y}-01-15`, endDate: `${y}-03-31`, status: "In Progress", color: null },
        { id: uid(), title: "Запуск Reels стратегії", desc: "Шаблони, формати, графік виробництва", links: [{ id: uid(), label: "Reels Best Practices", url: "https://example.com/reels" }], assignee: "SMM", user_id: null, startDate: `${y}-02-10`, endDate: `${y}-05-15`, status: "To Do", color: null },
        { id: uid(), title: "UGC програма", desc: "Механіка збору UGC від клієнтів", links: [], assignee: "SMM", user_id: null, startDate: `${y}-04-01`, endDate: `${y}-09-15`, status: "To Do", color: null },
      ],
    },
    {
      id: uid(),
      title: "Зростити органічний трафік до 30K/міс",
      owner: "SEO",
      priority: "🔴 Критичний",
      status: "В процесі",
      startDate: `${y}-01-06`,
      endDate: `${y}-12-31`,
      color: null,
      kpis: [
        { id: uid(), kpi_definition_id: uid(), name: "Органічні сесії/міс", current: 3000, target: 30000, unit: "", color: null, status: "В процесі" },
        { id: uid(), kpi_definition_id: uid(), name: "Ключів у ТОП-10", current: 50, target: 600, unit: "шт", color: null, status: "В процесі" },
        { id: uid(), kpi_definition_id: uid(), name: "Domain Rating", current: 15, target: 42, unit: "", color: null, status: "В процесі" },
      ],
      tasks: [
        { id: uid(), title: "Технічний SEO аудит", desc: "Crawl, швидкість, індексація", links: [{ id: uid(), label: "Screaming Frog", url: "https://screamingfrog.co.uk" }], assignee: "SEO", user_id: null, startDate: `${y}-01-06`, endDate: `${y}-03-10`, status: "In Progress", color: null },
        { id: uid(), title: "Семантичне ядро", desc: "Збір ключів, кластеризація", links: [], assignee: "SEO", user_id: null, startDate: `${y}-02-01`, endDate: `${y}-04-15`, status: "To Do", color: null },
        { id: uid(), title: "On-page оптимізація каталогу", desc: "Title, H1, контент категорій", links: [], assignee: "SEO", user_id: null, startDate: `${y}-03-01`, endDate: `${y}-07-30`, status: "To Do", color: null },
        { id: uid(), title: "Лінкбілдинг програма", desc: "Outreach, гостьові пости, PR", links: [{ id: uid(), label: "Ahrefs guide", url: "https://ahrefs.com/blog/link-building" }], assignee: "SEO", user_id: null, startDate: `${y}-04-01`, endDate: `${y}-12-20`, status: "To Do", color: null },
      ],
    },
    {
      id: uid(),
      title: "Досягти ROAS > 5x",
      owner: "Media Buyer",
      priority: "🟠 Високий",
      status: "Планується",
      startDate: `${y}-01-10`,
      endDate: `${y}-12-31`,
      color: null,
      kpis: [
        { id: uid(), kpi_definition_id: uid(), name: "ROAS", current: 2, target: 5.5, unit: "x", color: null, status: "В процесі" },
        { id: uid(), kpi_definition_id: uid(), name: "CPA", current: 350, target: 150, unit: "₴", color: null, status: "В процесі" },
        { id: uid(), kpi_definition_id: uid(), name: "Нових клієнтів/міс", current: 80, target: 800, unit: "", color: null, status: "В процесі" },
      ],
      tasks: [
        { id: uid(), title: "Пікселі і трекінг", desc: "Meta Pixel, GA4, server-side", links: [], assignee: "Media Buyer", user_id: null, startDate: `${y}-01-10`, endDate: `${y}-02-20`, status: "Done", color: null },
        { id: uid(), title: "Тестові кампанії", desc: "Тест аудиторій, креативів", links: [], assignee: "Media Buyer", user_id: null, startDate: `${y}-02-01`, endDate: `${y}-04-15`, status: "In Progress", color: null },
        { id: uid(), title: "Масштабування", desc: "Збільшення бюджетів", links: [], assignee: "Media Buyer", user_id: null, startDate: `${y}-04-01`, endDate: `${y}-08-30`, status: "To Do", color: null },
        { id: uid(), title: "Performance Max", desc: "PMax з фідом товарів", links: [], assignee: "Media Buyer", user_id: null, startDate: `${y}-07-01`, endDate: `${y}-12-20`, status: "To Do", color: null },
      ],
    },
    {
      id: uid(),
      title: "Знизити CAC < ₴200",
      owner: "Команда",
      priority: "🟡 Середній",
      status: "Планується",
      startDate: `${y}-03-01`,
      endDate: `${y}-12-31`,
      color: null,
      kpis: [
        { id: uid(), kpi_definition_id: uid(), name: "CAC (blended)", current: 400, target: 200, unit: "₴", color: null, status: "В процесі" },
        { id: uid(), kpi_definition_id: uid(), name: "LTV/CAC ratio", current: 1.5, target: 4, unit: "x", color: null, status: "В процесі" },
      ],
      tasks: [
        { id: uid(), title: "Attribution модель", desc: "Multi-touch через GA4", links: [], assignee: "Media Buyer", user_id: null, startDate: `${y}-03-01`, endDate: `${y}-05-15`, status: "To Do", color: null },
        { id: uid(), title: "Оптимізація воронки", desc: "A/B тести, CRO", links: [], assignee: "SEO", user_id: null, startDate: `${y}-03-15`, endDate: `${y}-06-30`, status: "To Do", color: null },
        { id: uid(), title: "Email/retention", desc: "Welcome, abandoned cart flows", links: [], assignee: "SMM", user_id: null, startDate: `${y}-05-01`, endDate: `${y}-10-15`, status: "To Do", color: null },
      ],
    },
  ];

  return p;
}
