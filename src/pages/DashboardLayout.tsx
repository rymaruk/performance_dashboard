import { useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FolderOpen, Loader2 } from "lucide-react";
import { Header, Nav, ProjectBar } from "../components/layout";
import { Dashboard } from "../components/dashboard/Dashboard";
import { Goals } from "../components/goals/Goals";
import { KPIPanel } from "../components/kpi/KPIPanel";
import { Gantt } from "../components/gantt/Gantt";
import { ApiIntegrationPanel } from "../components/api-integration/ApiIntegrationPanel";
import { Button } from "../components/ui/button";
import { useProject } from "../hooks/useProject";
import { useAuth } from "../hooks/AuthContext";
import { cn } from "@/lib/utils";
import type { TabKey } from "../types";

const VALID_TABS = new Set<string>(["dashboard", "goals", "kpi", "gantt", "api-integration"]);
const TAB_ROUTE_TO_KEY: Record<string, TabKey> = {
  dashboard: "dash",
  goals: "goals",
  kpi: "kpi",
  gantt: "gantt",
  "api-integration": "api-integration",
};
const TAB_KEY_TO_ROUTE: Record<TabKey, string> = {
  dash: "dashboard",
  goals: "goals",
  kpi: "kpi",
  gantt: "gantt",
  "api-integration": "api-integration",
};

export function DashboardLayout() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: urlProjectId, tab: urlTab } = useParams<{
    projectId?: string;
    tab?: string;
  }>();

  // Derive tab from URL
  const tabRoute = urlTab && VALID_TABS.has(urlTab) ? urlTab : null;
  const tab: TabKey = tabRoute ? TAB_ROUTE_TO_KEY[tabRoute] : "dash";

  const {
    projects,
    proj,
    openGoalIds,
    setOpenGoalIds,
    expandedTasks,
    ganttExpanded,
    stats,
    ganttRange,
    ganttMonths,
    teams,
    teamUsers,
    toggleTask,
    toggleGanttGoal,
    addProject,
    deleteProject,
    updateProjectSettings,
    addGoal,
    removeGoal,
    updateGoalField,
    changeGoalDates,
    changeGoalDateRange,
    changeTaskDateRange,
    addTask,
    removeTask,
    updateTask,
    addKPI,
    removeKPI,
    updateKPI,
    addLink,
    removeLink,
    updateLink,
    kpiDefinitions,
    loading,
    kpiHistoryRevision,
  } = useProject(urlProjectId ?? "");

  // Redirect logic: fix URL when projectId or tab is missing/invalid
  useEffect(() => {
    if (loading || projects.length === 0) return;

    const validProject = projects.find((p) => p.id === urlProjectId);
    const firstProjectId = projects[0].id;

    if (!urlProjectId || !validProject) {
      // No project in URL or invalid project → redirect to first project's dashboard
      navigate(`/${firstProjectId}/dashboard`, { replace: true });
      return;
    }

    if (!tabRoute) {
      // Project is valid but no tab segment → redirect to dashboard
      navigate(`/${urlProjectId}/dashboard`, { replace: true });
    }
  }, [loading, projects, urlProjectId, tabRoute, navigate]);

  const handleTabChange = useCallback(
    (t: TabKey) => {
      const pid = urlProjectId || projects[0]?.id;
      if (!pid) return;
      navigate(`/${pid}/${TAB_KEY_TO_ROUTE[t]}${location.search}`);
    },
    [urlProjectId, projects, navigate, location.search],
  );

  const handleSwitchProject = useCallback(
    (id: string) => {
      const currentTab = tabRoute ?? "dashboard";
      navigate(`/${id}/${currentTab}`);
    },
    [navigate, tabRoute],
  );

  const handleAddProject = useCallback(async () => {
    const newId = await addProject();
    if (newId) navigate(`/${newId}/goals`);
  }, [addProject, navigate]);

  const handleDeleteProject = useCallback(async () => {
    if (!proj.id) return;
    const nextId = await deleteProject(proj.id);
    if (nextId) navigate(`/${nextId}/dashboard`, { replace: true });
  }, [proj.id, deleteProject, navigate]);

  if (loading) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center bg-background text-sm",
          "text-muted-foreground",
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>Завантаження даних…</span>
        </div>
      </div>
    );
  }

  const hasProjects = projects.length > 0 && proj.id !== "";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <ProjectBar
        projects={projects}
        activeProjectId={urlProjectId ?? ""}
        onSwitch={handleSwitchProject}
        onSaveProject={updateProjectSettings}
        onDelete={handleDeleteProject}
        onAddProject={handleAddProject}
        isAdmin={isAdmin}
      />

      {hasProjects ? (
        <Nav tab={tab} onTabChange={handleTabChange} projectId={urlProjectId ?? ""}>
          {tab === "dash" && (
            <Dashboard proj={proj} stats={stats} teams={teams} />
          )}

          {tab === "goals" && (
            <Goals
              proj={proj}
              kpiDefinitions={kpiDefinitions}
              teams={teams}
              teamUsers={teamUsers}
              isAdmin={isAdmin}
              openGoalIds={openGoalIds}
              onOpenGoalIdsChange={setOpenGoalIds}
              expandedTasks={expandedTasks}
              onAddGoal={addGoal}
              onRemoveGoal={removeGoal}
              onUpdateGoalField={updateGoalField}
              onChangeGoalDates={changeGoalDates}
              onAddKPI={addKPI}
              onRemoveKPI={removeKPI}
              onUpdateKPI={updateKPI}
              onAddTask={addTask}
              onRemoveTask={removeTask}
              onUpdateTask={updateTask}
              onToggleTask={toggleTask}
              onAddLink={addLink}
              onRemoveLink={removeLink}
              onUpdateLink={updateLink}
              kpiHistoryRevision={kpiHistoryRevision}
            />
          )}

          {tab === "kpi" && (
            <KPIPanel proj={proj} teams={teams} onUpdateKPI={updateKPI} kpiHistoryRevision={kpiHistoryRevision} />
          )}

          {tab === "gantt" && (
            <Gantt
              proj={proj}
              teams={teams}
              teamUsers={teamUsers}
              ganttRange={ganttRange}
              ganttMonths={ganttMonths}
              ganttExpanded={ganttExpanded}
              onToggleGoal={toggleGanttGoal}
              onChangeGoalDates={changeGoalDates}
              onChangeGoalDateRange={changeGoalDateRange}
              onChangeTaskDateRange={changeTaskDateRange}
              onChangeTaskDates={(gid, tid, field, val) =>
                updateTask(gid, tid, (t) => ({ ...t, [field]: val }))
              }
            />
          )}

          {tab === "api-integration" && (
            <ApiIntegrationPanel
              projectId={urlProjectId ?? proj.id}
              isAdmin={isAdmin}
            />
          )}
        </Nav>
      ) : (
        <div
          className={cn(
            "flex flex-col items-center justify-center py-20 px-4",
            "text-muted-foreground",
          )}
        >
          <FolderOpen className="size-16 mb-4 text-muted-foreground" />
          <div className="text-base font-bold text-foreground mb-2">
            {isAdmin ? "Немає проектів" : "Немає доступних проектів"}
          </div>
          <div className="text-[13px] text-muted-foreground mb-5 text-center max-w-sm">
            {isAdmin
              ? "Створіть перший проект, щоб почати роботу"
              : "Тут відображаються лише проєкти, де вам призначені задачі. Зверніться до адміністратора, якщо потрібен доступ."}
          </div>
          {isAdmin && (
            <Button type="button" onClick={handleAddProject}>
              ＋ Створити проект
            </Button>
          )}
        </div>
      )}

      <div
        className={cn("text-center py-5 pb-7 text-[10px]", "text-muted-foreground")}
      >
        Performance Dashboard v3.0
      </div>
    </div>
  );
}
