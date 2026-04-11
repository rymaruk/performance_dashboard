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
  ProjectStats,
  GanttRange,
  GanttMonth,
  GoalRow,
  TaskRow,
  GoalKpiRow,
  ProjectRow,
  Team,
  UserProfile,
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
    user_id: row.user_id ?? null,
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

export function useProject(activeProjectId: string) {
  const { isAdmin, userTeamId, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [openGoalIds, setOpenGoalIds] = useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [ganttExpanded, setGanttExpanded] = useState<Record<string, boolean>>({});
  const [kpiDefinitions, setKpiDefinitions] = useState<KpiDefinition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamUsers, setTeamUsers] = useState<Record<string, UserProfile[]>>({});
  const [loading, setLoading] = useState(true);
  const [kpiHistoryRevision, setKpiHistoryRevision] = useState(0);

  const loadTeamUsers = useCallback(async (teamIds: string[]) => {
    const uniqueIds = [...new Set(teamIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;
    const { data } = await supabase
      .from("users")
      .select("*")
      .in("team_id", uniqueIds)
      .order("first_name", { ascending: true });
    if (!data) return;
    const map: Record<string, UserProfile[]> = {};
    for (const u of data as UserProfile[]) {
      const tid = u.team_id!;
      if (!map[tid]) map[tid] = [];
      map[tid].push(u);
    }
    setTeamUsers((prev) => ({ ...prev, ...map }));
  }, []);

  /* ─── Load full project tree from Supabase ─── */
  const loadProjects = useCallback(async () => {
    const [{ data: kpiDefs }, { data: teamRows }] = await Promise.all([
      supabase
        .from("kpi_definitions")
        .select("*")
        .order("name", { ascending: true }),
      supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true }),
    ]);
    setKpiDefinitions((kpiDefs as KpiDefinition[]) ?? []);
    setTeams((teamRows as Team[]) ?? []);

    const { data: projRows } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    if (!projRows || projRows.length === 0) {
      setProjects([]);
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

    let loaded: Project[] = projRows.map((pr: ProjectRow) => ({
      id: pr.id,
      name: pr.name,
      desc: pr.description,
      color: pr.color ?? null,
      goals: goalsByProject.get(pr.id) ?? [],
      createdAt: new Date(pr.created_at).getTime(),
    }));

    if (!isAdmin) {
      const uid = profile?.id;
      if (!uid) {
        loaded = [];
      } else {
        loaded = loaded.filter((p) =>
          p.goals.some((g) => g.tasks.some((t) => t.user_id === uid)),
        );
      }
    }

    const goalTeamIds = allGoals.map((g) => g.team_id).filter(Boolean) as string[];
    if (goalTeamIds.length > 0) {
      await loadTeamUsers(goalTeamIds);
    }

    setProjects(loaded);
    setLoading(false);
  }, [isAdmin, userTeamId, profile?.id, loadTeamUsers]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const proj = useMemo(
    () =>
      projects.find((p) => p.id === activeProjectId) ??
      projects[0] ?? {
        id: "",
        name: "",
        desc: "",
        color: null,
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
    // Extend range by 1 month before and after for readability
    const mnDate = new Date(mn);
    const padStart = fmt(new Date(mnDate.getFullYear(), mnDate.getMonth() - 1, 1));
    const mxDate = new Date(mx);
    const padEnd = fmt(new Date(mxDate.getFullYear(), mxDate.getMonth() + 2, 0));
    return { start: padStart, end: padEnd, totalDays: Math.max(diffDays(padStart, padEnd), 30) };
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
  const addProject = async (): Promise<string | null> => {
    if (!isAdmin) return null;
    const projColor = ACCENT_COLORS[projects.length % ACCENT_COLORS.length].key;
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: "Новий проект", description: "", color: projColor })
      .select()
      .single();
    if (error || !data) return null;
    const np: Project = {
      id: data.id,
      name: data.name,
      desc: data.description,
      color: data.color ?? projColor,
      goals: [],
      createdAt: new Date(data.created_at).getTime(),
    };
    setProjects((ps) => [...ps, np]);
    return np.id;
  };

  const deleteProject = async (id: string): Promise<string | null> => {
    if (!isAdmin) return null;
    if (projects.length <= 1) return null;
    await supabase.from("projects").delete().eq("id", id);
    const nx = projects.find((p) => p.id !== id)!;
    setProjects((ps) => ps.filter((p) => p.id !== id));
    return nx.id;
  };

  /* ─── Project field updaters (dialog saves name + desc + color in one request) ─── */
  const updateProjectSettings = async (
    name: string,
    desc: string,
    color: string,
  ) => {
    if (!isAdmin) return;
    const id = activeProjectId;
    if (!id) return;
    updateLocalProj((p) => ({ ...p, name, desc, color }));
    const { error } = await supabase
      .from("projects")
      .update({ name, description: desc, color })
      .eq("id", id);
    if (error) {
      console.error("updateProjectSettings", error);
      void loadProjects();
    }
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
    if (field === "team_id") {
      updateLocalGoal(gid, (g) => ({
        ...g,
        team_id: value as string | null,
        tasks: g.tasks.map((t) => ({ ...t, user_id: null })),
      }));
      await supabase.from("goals").update({ team_id: value }).eq("id", gid);
      const g = proj.goals.find((x) => x.id === gid);
      if (g) {
        const taskIds = g.tasks.map((t) => t.id);
        if (taskIds.length > 0) {
          await supabase
            .from("tasks")
            .update({ user_id: null })
            .in("id", taskIds);
        }
      }
      if (value) {
        await loadTeamUsers([value as string]);
      }
      return;
    }

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

  const changeGoalDateRange = async (
    gid: string,
    newStart: string,
    newEnd: string,
  ) => {
    const g = proj.goals.find((x) => x.id === gid);
    if (!g) return;
    const ng = { ...g, startDate: newStart, endDate: newEnd };
    if (ng.startDate > ng.endDate) ng.endDate = ng.startDate;
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

  const changeTaskDateRange = async (
    gid: string,
    tid: string,
    newStart: string,
    newEnd: string,
  ) => {
    const g = proj.goals.find((x) => x.id === gid);
    if (!g) return;
    // Clamp to goal boundaries
    let sd = newStart < g.startDate ? g.startDate : newStart;
    let ed = newEnd > g.endDate ? g.endDate : newEnd;
    if (sd > ed) ed = sd;

    await updateTask(gid, tid, (t) => ({ ...t, startDate: sd, endDate: ed }));
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
        user_id: null,
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
          user_id: u.user_id,
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
    comment?: string,
  ) => {
    // Capture old value before update for history
    const goal = proj.goals.find((g) => g.id === gid);
    const oldKpi = goal?.kpis.find((k) => k.id === kid);
    const oldCurrent = oldKpi?.current ?? 0;

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

      // Insert history record if current value changed and comment provided
      if (comment !== undefined && u.current !== oldCurrent) {
        const { error: histErr } = await supabase.from("kpi_value_history").insert({
          goal_kpi_id: kid,
          old_value: oldCurrent,
          new_value: u.current,
          comment: comment || "",
          user_id: profile?.id ?? null,
          user_name: profile
            ? `${profile.first_name} ${profile.last_name}`
            : "",
        });
        if (histErr) console.error("kpi_value_history insert failed:", histErr);
        else setKpiHistoryRevision((r) => r + 1);
      }
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
    openGoalIds,
    setOpenGoalIds,
    expandedTasks,
    ganttExpanded,
    stats,
    ganttRange,
    ganttMonths,
    kpiDefinitions,
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
    loading,
    reloadProjects: loadProjects,
    kpiHistoryRevision,
  };
}
