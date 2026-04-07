/* ── Team ── */

export type TeamStatus = "active" | "suspended";

export interface Team {
  id: string;
  name: string;
  status: TeamStatus;
  color: string | null;
  created_at: string;
}

/* ── User / Auth ── */

export type UserRole = "admin" | "user";

/** Кольори кілець «Загальний прогрес» (ключі збігаються з AccentColor у constants). */
export interface DashboardOverviewAccents {
  goals: string;
  tasks: string;
  kpi: string;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  login: string;
  role: UserRole;
  team_id: string | null;
  color: string | null;
  /** З public.users.dashboard_overview_accents; відсутнє/null = дефолти в UI */
  dashboard_overview_accents?: DashboardOverviewAccents | null;
  created_at: string;
  team?: Team | null;
}

/* ── Link ── */

export interface Link {
  id: string;
  task_id?: string;
  label: string;
  url: string;
}

/* ── KPI Definition (master list) ── */

export interface KpiDefinition {
  id: string;
  name: string;
  unit: string;
  target_value: number;
  description: string;
  color: string | null;
  created_at: string;
}

/* ── KPI (goal ↔ kpi_definition junction, with runtime name/unit) ── */

export interface KPI {
  id: string;
  goal_id?: string;
  kpi_definition_id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  color: string | null;
}

/* ── DB row shape for goal_kpis junction ── */
export interface GoalKpiRow {
  id: string;
  goal_id: string;
  kpi_definition_id: string;
  current_value: number;
  target_value: number;
  color: string | null;
  created_at: string;
  kpi_definition?: KpiDefinition;
}

export interface KpiValueHistory {
  id: string;
  goal_kpi_id: string;
  old_value: number;
  new_value: number;
  comment: string;
  user_id: string | null;
  user_name: string;
  created_at: string;
}

/* ── Task statuses ── */

export type TaskStatus = "To Do" | "In Progress" | "Done";

/* ── Goal statuses ── */

export type GoalStatus =
  | "Планується"
  | "В процесі"
  | "На ревʼю"
  | "Завершено"
  | "Заблоковано";

/* ── Roles / assignees ── */

export type Role = "SMM" | "SEO" | "Media Buyer" | "Команда";

/* ── Priority ── */

export type Priority =
  | "🔴 Критичний"
  | "🟠 Високий"
  | "🟡 Середній"
  | "🟢 Низький";

/* ── Task ── */

export interface Task {
  id: string;
  goal_id?: string;
  title: string;
  desc: string;
  links: Link[];
  assignee: Role;
  user_id: string | null;
  startDate: string;
  endDate: string;
  status: TaskStatus;
  color: string | null;
}

/* ── DB row shape for Task ── */
export interface TaskRow {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  assignee: string;
  user_id: string | null;
  status: string;
  start_date: string;
  end_date: string;
  color: string | null;
  created_at: string;
}

/* ── Goal ── */

export interface Goal {
  id: string;
  project_id?: string;
  team_id?: string | null;
  title: string;
  owner: Role;
  priority: Priority;
  status: GoalStatus;
  startDate: string;
  endDate: string;
  color: string | null;
  kpis: KPI[];
  tasks: Task[];
}

/* ── DB row shape for Goal ── */
export interface GoalRow {
  id: string;
  project_id: string;
  team_id: string | null;
  title: string;
  owner: string;
  priority: string;
  status: string;
  start_date: string;
  end_date: string;
  color: string | null;
  created_at: string;
}

/* ── Project ── */

export interface Project {
  id: string;
  name: string;
  desc: string;
  color: string | null;
  goals: Goal[];
  createdAt: number;
}

/* ── DB row shape for Project ── */
export interface ProjectRow {
  id: string;
  name: string;
  description: string;
  color: string | null;
  created_at: string;
}

/* ── UI types ── */

export type TabKey = "dash" | "goals" | "kpi" | "gantt" | "api-integration";

export interface GanttMonth {
  label: string;
  year: number;
  days: number;
  month: number;
}

export interface GanttRange {
  start: string;
  end: string;
  totalDays: number;
}

/* ── API Integration ── */

export interface ApiIntegration {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  api_token: string;
  api_url: string;
  pagination_param: string;
  per_page_param: string;
  per_page: number;
  auth_header: string;
  auth_prefix: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface ApiIntegrationData {
  id: string;
  integration_id: string;
  record_data: Record<string, unknown>;
  created_at: string;
}

/* ── UI types ── */

export interface ProjectStats {
  totalGoals: number;
  goalsDone: number;
  totalKPIs: number;
  completedKPIs: number;
  kpiPct: number;
  totalTasks: number;
  doneTasks: number;
  inProgress: number;
  taskPct: number;
}
