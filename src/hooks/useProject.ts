import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { today, addDays, diffDays, fmt } from "../utils/date";
import { MONTH_NAMES, ACCENT_COLORS } from "../constants";
import type {
  Project,
  Goal,
  KPI,
  KpiDefinition,
  Task,
  Link,
  TabKey,
  ProjectStats,
  GanttRange,
  GanttMonth,
  GoalRow,
  TaskRow,
  GoalKpiRow,
  ProjectRow,
} from "../types";
import type { Role, Priority, GoalStatus, TaskStatus } from "../types";

/* ── helpers ── */

function goalFromRow(
  row: GoalRow,
  tasks: Task[],
  kpis: KPI[],
): Goal {
  return {
    id: row.id,
    project_id: row.project_id,
    team_id: row.team_id,
    title: row.title,
    owner: row.owner as Role,
    priority: row.priority as Priority,
    status: row.status as GoalStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    color: row.color ?? null,
    kpis,
    tasks,
  };
}

function taskFromRow(row: TaskRow, links: Link[]): Task {
  return {
    id: row.id,
    goal_id: row.goal_id,
    title: row.title,
    desc: row.description,
    links,
    assignee: row.assignee as Role,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as TaskStatus,
    color: row.color ?? null,
  };
}

function kpiFromJunction(row: GoalKpiRow): KPI {
  const def = row.kpi_definition as KpiDefinition | undefined;
  return {
    id: row.id,
    goal_id: row.goal_id,
    kpi_definition_id: row.kpi_definition_id,
    name: def?.name ?? "",
    current: Number(row.current_value),
    target: Number(row.target_value),
    unit: def?.unit ?? "%",
    color: row.color ?? def?.color ?? null,
  };
}

function clampTasks(tasks: Task[], gs: string, ge: string): Task[] {
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
    return { ...t, startDate: sd, endDate: ed, color: t.color };
  });
}

/* ── main hook ── */

export function useProject() {
  const { isAdmin, userTeamId } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActive] = useState<string>("");
  const [tab, setTab] = useState<TabKey>("dash");
  const [openGoalIds, setOpenGoalIds] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [ganttExpanded, setGanttExpanded] = useState<Record<string, boolean>>({});
  const [kpiDefinitions, setKpiDefinitions] = useState<KpiDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─── Load full project tree from Supabase ─── */
  const loadProjects = useCallback(async () => {
    const { data: kpiDefs } = await supabase
      .from("kpi_definitions")
      .select("*")
      .order("name", { ascending: true });
    setKpiDefinitions((kpiDefs as KpiDefinition[]) ?? []);

    const { data: projRows } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    if (!projRows || projRows.length === 0) {
      setProjects([]);
      setActive("");
      setLoading(false);
      return;
    }

    const projectIds = projRows.map((p: ProjectRow) => p.id);

    let goalsQuery = supabase
      .from("goals")
      .select("*")
      .in("project_id", projectIds)
      .order("created_at", { ascending: true });

    if (!isAdmin && userTeamId) {
      goalsQuery = goalsQuery.or(`team_id.eq.${userTeamId},team_id.is.null`);
    }

    const { data: goalRows } = await goalsQuery;
    const allGoals: GoalRow[] = goalRows ?? [];
    const goalIds = allGoals.map((g) => g.id);

    let allTasks: TaskRow[] = [];
    let allGoalKpis: GoalKpiRow[] = [];
    let allLinks: Link[] = [];

    if (goalIds.length > 0) {
      const [tasksRes, kpisRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .in("goal_id", goalIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("goal_kpis")
          .select("*, kpi_definition:kpi_definitions(*)")
          .in("goal_id", goalIds),
      ]);
      allTasks = tasksRes.data ?? [];
      allGoalKpis = (kpisRes.data as unknown as GoalKpiRow[]) ?? [];

      const taskIds = allTasks.map((t) => t.id);
      if (taskIds.length > 0) {
        const { data: linkRows } = await supabase
          .from("links")
          .select("*")
          .in("task_id", taskIds);
        allLinks = linkRows ?? [];
      }
    }

    const linksByTask = new Map<string, Link[]>();
    for (const l of allLinks) {
      const arr = linksByTask.get(l.task_id!) ?? [];
      arr.push(l);
      linksByTask.set(l.task_id!, arr);
    }

    const tasksByGoal = new Map<string, Task[]>();
    for (const tr of allTasks) {
      const arr = tasksByGoal.get(tr.goal_id) ?? [];
      arr.push(taskFromRow(tr, linksByTask.get(tr.id) ?? []));
      tasksByGoal.set(tr.goal_id, arr);
    }

    const kpisByGoal = new Map<string, KPI[]>();
    for (const gkr of allGoalKpis) {
      const arr = kpisByGoal.get(gkr.goal_id) ?? [];
      arr.push(kpiFromJunction(gkr));
      kpisByGoal.set(gkr.goal_id, arr);
    }

    const goalsByProject = new Map<string, Goal[]>();
    for (const gr of allGoals) {
      const arr = goalsByProject.get(gr.project_id) ?? [];
      arr.push(
        goalFromRow(
          gr,
          tasksByGoal.get(gr.id) ?? [],
          kpisByGoal.get(gr.id) ?? [],
        ),
      );
      goalsByProject.set(gr.project_id, arr);
    }

    const loaded: Project[] = projRows.map((pr: ProjectRow) => ({
      id: pr.id,
      name: pr.name,
      desc: pr.description,
      color: pr.color ?? null,
      goals: goalsByProject.get(pr.id) ?? [],
      createdAt: new Date(pr.created_at).getTime(),
    }));

    setProjects(loaded);
    if (!activeProjectId || !loaded.find((p) => p.id === activeProjectId)) {
      setActive(loaded[0]?.id ?? "");
    }
    setLoading(false);
  }, [isAdmin, userTeamId, activeProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const proj = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? {
      id: "",
      name: "",
      desc: "",
      goals: [],
      createdAt: Date.now(),
    },
    [projects, activeProjectId],
  );

  /* helper: update local state optimistically + sync */
  const updateLocalProj = useCallback(
    (fn: (p: Project) => Project) =>
      setProjects((ps) =>
        ps.map((p) => (p.id === activeProjectId ? fn({ ...p }) : p)),
      ),
    [activeProjectId],
  );

  const updateLocalGoal = useCallback(
    (gid: string, fn: (g: Goal) => Goal) =>
      updateLocalProj((p) => ({
        ...p,
        goals: p.goals.map((g) => (g.id === gid ? fn({ ...g }) : g)),
      })),
    [updateLocalProj],
  );

  /* ─── UI toggles ─── */
  const toggleTask = (id: string) =>
    setExpandedTasks((x) => ({ ...x, [id]: !x[id] }));
  const toggleGanttGoal = (id: string) =>
    setGanttExpanded((x) => ({ ...x, [id]: !x[id] }));

  /* ─── Stats ─── */
  const stats: ProjectStats = useMemo(() => {
    let tK = 0,
      cK = 0,
      tT = 0,
      dT = 0,
      iP = 0;
    proj.goals.forEach((g) => {
      g.kpis.forEach((k) => {
        tK++;
        if (k.current >= k.target) cK++;
      });
      g.tasks.forEach((t) => {
        tT++;
        if (t.status === "Done") dT++;
        if (t.status === "In Progress") iP++;
      });
    });
    return {
      totalGoals: proj.goals.length,
      goalsDone: proj.goals.filter((g) => g.status === "Завершено").length,
      totalKPIs: tK,
      completedKPIs: cK,
      kpiPct: tK ? Math.round((cK / tK) * 100) : 0,
      totalTasks: tT,
      doneTasks: dT,
      inProgress: iP,
      taskPct: tT ? Math.round((dT / tT) * 100) : 0,
    };
  }, [proj]);

  /* ─── Gantt ─── */
  const ganttRange: GanttRange = useMemo(() => {
    if (!proj.goals.length)
      return { start: today(), end: addDays(today(), 365), totalDays: 365 };
    let mn = proj.goals[0].startDate,
      mx = proj.goals[0].endDate;
    proj.goals.forEach((g) => {
      if (g.startDate < mn) mn = g.startDate;
      if (g.endDate > mx) mx = g.endDate;
      g.tasks.forEach((t) => {
        if (t.startDate < mn) mn = t.startDate;
        if (t.endDate > mx) mx = t.endDate;
      });
    });
    return { start: mn, end: mx, totalDays: Math.max(diffDays(mn, mx), 30) };
  }, [proj]);

  const ganttMonths: GanttMonth[] = useMemo(() => {
    const ms: GanttMonth[] = [];
    const sd = new Date(ganttRange.start);
    const ed = new Date(ganttRange.end);
    let cur = new Date(sd.getFullYear(), sd.getMonth(), 1);
    while (cur <= ed) {
      const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const visStart = cur < sd ? sd : cur;
      const visEnd = mEnd > ed ? ed : mEnd;
      const days = diffDays(fmt(visStart), fmt(visEnd)) + 1;
      ms.push({
        label: MONTH_NAMES[cur.getMonth()],
        year: cur.getFullYear(),
        days,
        month: cur.getMonth(),
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return ms;
  }, [ganttRange]);

  /* ─── Project actions ─── */
  const addProject = async () => {
    const projColor = ACCENT_COLORS[projects.length % ACCENT_COLORS.length].key;
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: "Новий проект", description: "", color: projColor })
      .select()
      .single();
    if (error || !data) return;
    const np: Project = {
      id: data.id,
      name: data.name,
      desc: data.description,
      color: data.color ?? projColor,
      goals: [],
      createdAt: new Date(data.created_at).getTime(),
    };
    setProjects((ps) => [...ps, np]);
    setActive(np.id);
    setTab("goals");
  };

  const deleteProject = async (id: string) => {
    if (projects.length <= 1) return;
    await supabase.from("projects").delete().eq("id", id);
    const nx = projects.find((p) => p.id !== id)!;
    setProjects((ps) => ps.filter((p) => p.id !== id));
    if (activeProjectId === id) setActive(nx.id);
  };

  const switchProject = (id: string) => {
    setActive(id);
    setTab("dash");
  };

  /* ─── Project field updaters ─── */
  const updateProjName = async (v: string) => {
    updateLocalProj((p) => ({ ...p, name: v }));
    await supabase
      .from("projects")
      .update({ name: v })
      .eq("id", activeProjectId);
  };

  const updateProjDesc = async (v: string) => {
    updateLocalProj((p) => ({ ...p, desc: v }));
    await supabase
      .from("projects")
      .update({ description: v })
      .eq("id", activeProjectId);
  };

  const updateProjColor = async (v: string) => {
    updateLocalProj((p) => ({ ...p, color: v }));
    await supabase
      .from("projects")
      .update({ color: v })
      .eq("id", activeProjectId);
  };

  /* ─── Goal actions ─── */
  const addGoal = async () => {
    const s = today();
    const e = addDays(s, 90);
    const goalColor = ACCENT_COLORS[proj.goals.length % ACCENT_COLORS.length].key;
    const { data, error } = await supabase
      .from("goals")
      .insert({
        project_id: activeProjectId,
        team_id: isAdmin ? null : userTeamId,
        title: "Нова стратегічна ціль",
        owner: "Команда",
        priority: "🟡 Середній",
        status: "Планується",
        start_date: s,
        end_date: e,
        color: goalColor,
      })
      .select()
      .single();
    if (error || !data) return;
    const ng: Goal = goalFromRow(data as GoalRow, [], []);
    ng.title = "Нова стратегічна ціль";
    updateLocalProj((p) => ({ ...p, goals: [...p.goals, ng] }));
    setOpenGoalIds((prev) => [...prev, ng.id]);
  };

  const removeGoal = async (gid: string) => {
    await supabase.from("goals").delete().eq("id", gid);
    updateLocalProj((p) => ({
      ...p,
      goals: p.goals.filter((g) => g.id !== gid),
    }));
  };

  const updateGoalField = async (
    gid: string,
    field: keyof Goal,
    value: unknown,
  ) => {
    updateLocalGoal(gid, (g) => ({ ...g, [field]: value }));
    const dbField =
      field === "startDate"
        ? "start_date"
        : field === "endDate"
          ? "end_date"
          : field;
    if (["kpis", "tasks", "project_id"].includes(field as string)) return;
    if (field === "color") {
      await supabase.from("goals").update({ color: value }).eq("id", gid);
      return;
    }
    await supabase
      .from("goals")
      .update({ [dbField]: value })
      .eq("id", gid);
  };

  const changeGoalDates = async (
    gid: string,
    field: "startDate" | "endDate",
    val: string,
  ) => {
    const g = proj.goals.find((x) => x.id === gid);
    if (!g) return;
    const ng = { ...g, [field]: val };
    if (field === "startDate" && ng.startDate > ng.endDate)
      ng.endDate = ng.startDate;
    if (field === "endDate" && ng.endDate < ng.startDate)
      ng.startDate = ng.endDate;
    ng.tasks = clampTasks(ng.tasks, ng.startDate, ng.endDate);

    updateLocalGoal(gid, () => ng);

    await supabase
      .from("goals")
      .update({ start_date: ng.startDate, end_date: ng.endDate })
      .eq("id", gid);

    for (const t of ng.tasks) {
      await supabase
        .from("tasks")
        .update({ start_date: t.startDate, end_date: t.endDate })
        .eq("id", t.id);
    }
  };

  /* ─── Task actions ─── */
  const addTask = async (gid: string) => {
    const g = proj.goals.find((x) => x.id === gid);
    const sd = g ? g.startDate : today();
    const ed = g ? g.endDate : addDays(today(), 90);
    const taskEnd = addDays(sd, 14) > ed ? ed : addDays(sd, 14);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        goal_id: gid,
        title: "Нова задача",
        description: "",
        assignee: "SMM",
        status: "To Do",
        start_date: sd,
        end_date: taskEnd,
        color: g?.color ?? null,
      })
      .select()
      .single();
    if (error || !data) return;
    const nt: Task = taskFromRow(data as TaskRow, []);
    nt.title = "Нова задача";
    updateLocalGoal(gid, (gg) => ({ ...gg, tasks: [...gg.tasks, nt] }));
  };

  const removeTask = async (gid: string, tid: string) => {
    await supabase.from("tasks").delete().eq("id", tid);
    updateLocalGoal(gid, (g) => ({
      ...g,
      tasks: g.tasks.filter((t) => t.id !== tid),
    }));
  };

  const updateTask = async (
    gid: string,
    tid: string,
    fn: (t: Task) => Task,
  ) => {
    let updated: Task | null = null;
    updateLocalGoal(gid, (g) => ({
      ...g,
      tasks: g.tasks.map((t) => {
        if (t.id === tid) {
          updated = fn({ ...t });
          return updated;
        }
        return t;
      }),
    }));
    if (updated) {
      const u = updated as Task;
      await supabase
        .from("tasks")
        .update({
          title: u.title,
          description: u.desc,
          assignee: u.assignee,
          status: u.status,
          start_date: u.startDate,
          end_date: u.endDate,
          color: u.color,
        })
        .eq("id", tid);
    }
  };

  /* ─── KPI actions (goal_kpis junction) ─── */
  const addKPI = async (gid: string, kpiDefinitionId: string) => {
    const g = proj.goals.find((x) => x.id === gid);
    const { data, error } = await supabase
      .from("goal_kpis")
      .insert({
        goal_id: gid,
        kpi_definition_id: kpiDefinitionId,
        current_value: 0,
        target_value: 100,
        color: g?.color ?? null,
      })
      .select("*, kpi_definition:kpi_definitions(*)")
      .single();
    if (error || !data) return;
    const nk = kpiFromJunction(data as unknown as GoalKpiRow);
    updateLocalGoal(gid, (g) => ({ ...g, kpis: [...g.kpis, nk] }));
  };

  const removeKPI = async (gid: string, kid: string) => {
    await supabase.from("goal_kpis").delete().eq("id", kid);
    updateLocalGoal(gid, (g) => ({
      ...g,
      kpis: g.kpis.filter((k) => k.id !== kid),
    }));
  };

  const updateKPI = async (
    gid: string,
    kid: string,
    fn: (k: KPI) => KPI,
  ) => {
    let updated: KPI | null = null;
    updateLocalGoal(gid, (g) => ({
      ...g,
      kpis: g.kpis.map((k) => {
        if (k.id === kid) {
          updated = fn({ ...k });
          return updated;
        }
        return k;
      }),
    }));
    if (updated) {
      const u = updated as KPI;
      await supabase
        .from("goal_kpis")
        .update({
          current_value: u.current,
          target_value: u.target,
          color: u.color,
        })
        .eq("id", kid);
    }
  };

  /* ─── Link actions ─── */
  const addLink = async (gid: string, tid: string) => {
    const { data, error } = await supabase
      .from("links")
      .insert({ task_id: tid, label: "", url: "" })
      .select()
      .single();
    if (error || !data) return;
    const nl: Link = { id: data.id, task_id: data.task_id, label: "", url: "" };
    updateTask(gid, tid, (t) => ({ ...t, links: [...t.links, nl] }));
  };

  const removeLink = async (gid: string, tid: string, lid: string) => {
    await supabase.from("links").delete().eq("id", lid);
    updateTask(gid, tid, (t) => ({
      ...t,
      links: t.links.filter((l) => l.id !== lid),
    }));
  };

  const updateLink = async (
    gid: string,
    tid: string,
    lid: string,
    lk: Task["links"][0],
  ) => {
    updateTask(gid, tid, (t) => ({
      ...t,
      links: t.links.map((l) => (l.id === lid ? lk : l)),
    }));
    await supabase
      .from("links")
      .update({ label: lk.label, url: lk.url })
      .eq("id", lid);
  };

  return {
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
    kpiDefinitions,
    toggleTask,
    toggleGanttGoal,
    addProject,
    deleteProject,
    switchProject,
    updateProjName,
    updateProjDesc,
    updateProjColor,
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
    loading,
    reloadProjects: loadProjects,
  };
}
