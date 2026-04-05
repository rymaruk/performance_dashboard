import { Header, Nav, ProjectBar } from "../components/layout";
import { Dashboard } from "../components/dashboard/Dashboard";
import { Goals } from "../components/goals/Goals";
import { KPIPanel } from "../components/kpi/KPIPanel";
import { Gantt } from "../components/gantt/Gantt";
import { useProject } from "../hooks/useProject";

export function DashboardLayout() {
  const {
    projects,
    proj,
    activeProjectId,
    tab,
    setTab,
    expandedGoals,
    expandedTasks,
    ganttExpanded,
    stats,
    ganttRange,
    ganttMonths,
    toggleGoal,
    isGoalOpen,
    toggleTask,
    toggleGanttGoal,
    addProject,
    deleteProject,
    switchProject,
    updateProjName,
    updateProjDesc,
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span>Завантаження даних…</span>
        </div>
      </div>
    );
  }

  const hasProjects = projects.length > 0 && proj.id !== "";

  return (
    <div className="min-h-screen bg-gray-100">
      <Header onAddProject={addProject} />

      <ProjectBar
        projects={projects}
        activeProjectId={activeProjectId}
        onSwitch={switchProject}
        onUpdateName={updateProjName}
        onUpdateDesc={updateProjDesc}
        onDelete={() => proj.id && deleteProject(proj.id)}
      />

      {hasProjects ? (
        <>
          <Nav tab={tab} onTabChange={setTab} />

          {tab === "dash" && <Dashboard proj={proj} stats={stats} />}

          {tab === "goals" && (
            <Goals
              proj={proj}
              kpiDefinitions={kpiDefinitions}
              expandedGoals={expandedGoals}
              expandedTasks={expandedTasks}
              onToggleGoal={toggleGoal}
              isGoalOpen={isGoalOpen}
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
          )}

          {tab === "kpi" && <KPIPanel proj={proj} onUpdateKPI={updateKPI} />}

          {tab === "gantt" && (
            <Gantt
              proj={proj}
              ganttRange={ganttRange}
              ganttMonths={ganttMonths}
              ganttExpanded={ganttExpanded}
              onToggleGoal={toggleGanttGoal}
              onChangeGoalDates={changeGoalDates}
              onChangeTaskDates={(gid, tid, field, val) =>
                updateTask(gid, tid, (t) => ({ ...t, [field]: val }))
              }
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-base font-bold text-gray-700 mb-2">
            Немає проектів
          </div>
          <div className="text-[13px] text-gray-400 mb-5">
            Створіть перший проект, щоб почати роботу
          </div>
          <button
            onClick={addProject}
            className="px-7 py-2.5 text-sm font-bold text-white bg-green-700 rounded-xl cursor-pointer hover:bg-green-600 transition-colors"
          >
            ＋ Створити проект
          </button>
        </div>
      )}

      <div className="text-center py-5 pb-7 text-[10px] text-gray-400">
        Digital Marketing Dashboard v3.0
      </div>
    </div>
  );
}
