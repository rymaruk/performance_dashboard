import { FolderOpen, Loader2 } from "lucide-react";
import { Header, Nav, ProjectBar } from "../components/layout";
import { TabsContent } from "../components/layout/Nav";
import { Dashboard } from "../components/dashboard/Dashboard";
import { Goals } from "../components/goals/Goals";
import { KPIPanel } from "../components/kpi/KPIPanel";
import { Gantt } from "../components/gantt/Gantt";
import { Button } from "../components/ui/button";
import { useProject } from "../hooks/useProject";
import { useAuth } from "../hooks/AuthContext";
import { cn } from "@/lib/utils";

export function DashboardLayout() {
  const { isAdmin } = useAuth();
  const {
    projects,
    proj,
    activeProjectId,
    tab,
    setTab,
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
    switchProject,
    updateProjectSettings,
    addGoal,
    removeGoal,
    updateGoalField,
    changeGoalDates,
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
  } = useProject();

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
        activeProjectId={activeProjectId}
        onSwitch={switchProject}
        onSaveProject={updateProjectSettings}
        onDelete={() => proj.id && deleteProject(proj.id)}
        onAddProject={addProject}
        isAdmin={isAdmin}
      />

      {hasProjects ? (
        <>
          <Nav tab={tab} onTabChange={setTab}>
            <TabsContent value="dash">
              <Dashboard proj={proj} stats={stats} teams={teams} />
            </TabsContent>

            <TabsContent value="goals">
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
              />
            </TabsContent>

            <TabsContent value="kpi">
              <KPIPanel proj={proj} teams={teams} onUpdateKPI={updateKPI} />
            </TabsContent>

            <TabsContent value="gantt">
              <Gantt
                proj={proj}
                teams={teams}
                ganttRange={ganttRange}
                ganttMonths={ganttMonths}
                ganttExpanded={ganttExpanded}
                onToggleGoal={toggleGanttGoal}
                onChangeGoalDates={changeGoalDates}
                onChangeTaskDates={(gid, tid, field, val) =>
                  updateTask(gid, tid, (t) => ({ ...t, [field]: val }))
                }
              />
            </TabsContent>
          </Nav>
        </>
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
            <Button type="button" onClick={addProject}>
              ＋ Створити проект
            </Button>
          )}
        </div>
      )}

      <div
        className={cn("text-center py-5 pb-7 text-[10px]", "text-muted-foreground")}
      >
        Digital Marketing Dashboard v3.0
      </div>
    </div>
  );
}
