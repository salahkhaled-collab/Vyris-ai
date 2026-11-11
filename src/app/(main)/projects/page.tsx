"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { ProjectEmails } from "@/components/projects/ProjectEmails";
import { useUser } from "@/lib/user-context";
import { buildAttentionReport, overdueCutoff, type AttentionItem } from "@/lib/attention";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Circle,
  CircleDot,
  CheckCircle2,
  Ban,
  X,
  AlertTriangle,
} from "lucide-react";

type ProjectStatus = "ACTIVE" | "PAUSED" | "DONE";
type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  blockedReason: string | null;
  assigneeId: string | null;
}

interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  teamId: string | null;
  tasks: Task[];
  owner: { id: string; name: string | null; image: string | null };
}

const statusLabel: Record<ProjectStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  DONE: "Done",
};

const statusTone: Record<ProjectStatus, string> = {
  ACTIVE: "text-signal bg-signal/[0.12]",
  PAUSED: "text-brass bg-brass-soft",
  DONE: "text-muted bg-panel-2",
};

const taskStatusIcon: Record<TaskStatus, typeof Circle> = {
  TODO: Circle,
  IN_PROGRESS: CircleDot,
  BLOCKED: Ban,
  DONE: CheckCircle2,
};

/** Due dates are stored as midnight UTC, so format them in UTC to show the intended day. */
function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function isTaskOverdue(task: Task, now: Date): boolean {
  if (!task.dueDate || task.status === "DONE" || task.status === "BLOCKED") return false;
  return new Date(task.dueDate).getTime() < overdueCutoff(now).getTime();
}

const ATTENTION_PREVIEW = 5;

function nextTaskStatus(s: TaskStatus): TaskStatus {
  if (s === "TODO") return "IN_PROGRESS";
  if (s === "IN_PROGRESS") return "DONE";
  return "TODO";
}

export default function ProjectsPage() {
  const { workspaceType } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});
  const [newTaskDue, setNewTaskDue] = useState<Record<string, string>>({});
  const [blockingTaskId, setBlockingTaskId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [shareError, setShareError] = useState<string | null>(null);
  const { data: session } = useSession();
  const myId = session?.user?.id ?? null;
  const [assignError, setAssignError] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []))
      .finally(() => setLoading(false));
  }

  /** Re-read projects without the loading state, e.g. to show tasks an automation just created. */
  function refreshQuietly() {
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { projects?: Project[] } | null) => {
        if (data?.projects) setProjects(data.projects);
      })
      .catch(() => {});
  }

  // Team members for the assignee picker. Solo users get none, so no picker shows.
  useEffect(() => {
    fetch("/api/team/members")
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((d: { members?: TeamMember[] }) => setMembers(Array.isArray(d.members) ? d.members : []))
      .catch(() => setMembers([]));
  }, []);

  useEffect(load, []);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function createProject() {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        shareWithTeam,
      }),
    });
    if (res.ok) {
      const project = await res.json();
      setProjects((prev) => [project, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setShareWithTeam(false);
      setCreating(false);
      setExpanded((prev) => new Set(prev).add(project.id));
    }
  }

  async function setProjectSharing(id: string, share: boolean) {
    const previous = projects;
    setShareError(null);
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, teamId: share ? "pending" : null } : p)));
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareWithTeam: share }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't change sharing.");
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, teamId: data.teamId ?? null } : p)));
    } catch (err) {
      setProjects(previous);
      setShareError(err instanceof Error ? err.message : "Couldn't change sharing.");
    }
  }

  async function updateProjectStatus(id: string, status: ProjectStatus) {
    const previous = projects;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Status update failed: ${res.status}`);
    } catch (err) {
      setProjects(previous);
      console.error(err);
    }
  }

  async function deleteProject(id: string) {
    const previous = projects;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    } catch (err) {
      setProjects(previous);
      console.error(err);
    }
  }

  async function addTask(projectId: string) {
    const title = newTaskInputs[projectId]?.trim();
    if (!title) return;
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, dueDate: newTaskDue[projectId] || undefined }),
    });
    if (res.ok) {
      const task = await res.json();
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p))
      );
      setNewTaskInputs((prev) => ({ ...prev, [projectId]: "" }));
      setNewTaskDue((prev) => ({ ...prev, [projectId]: "" }));
    }
  }

  /** Optimistically set a task's status; the server clears blockedReason when leaving BLOCKED. */
  async function setTaskStatus(
    projectId: string,
    taskId: string,
    status: TaskStatus,
    blockedReason: string | null = null
  ) {
    const previous = projects;
    const reason = status === "BLOCKED" ? blockedReason : null;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status, blockedReason: reason } : t)),
            }
          : p
      )
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status === "BLOCKED" ? { status, blockedReason: reason } : { status }),
      });
      if (!res.ok) throw new Error(`Task status update failed: ${res.status}`);
      // Blocking or finishing a task can fire automation rules that create
      // follow-up tasks on the server; pull them in without a loading flash.
      if (status === "BLOCKED" || status === "DONE") refreshQuietly();
    } catch (err) {
      setProjects(previous);
      console.error(err);
    }
  }

  async function assignTask(projectId: string, taskId: string, assigneeId: string | null) {
    const previous = projects;
    setAssignError(null);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, assigneeId } : t)) }
          : p
      )
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId }),
      });
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Only the task owner can reassign it." : "Couldn't assign that task.");
      }
    } catch (err) {
      setProjects(previous);
      setAssignError(err instanceof Error ? err.message : "Couldn't assign that task.");
    }
  }

  function cycleTaskStatus(projectId: string, task: Task) {
    void setTaskStatus(projectId, task.id, nextTaskStatus(task.status));
  }

  function confirmBlocked(projectId: string, taskId: string) {
    void setTaskStatus(projectId, taskId, "BLOCKED", blockReason.trim() || null);
    setBlockingTaskId(null);
    setBlockReason("");
  }

  function openProject(projectId: string) {
    setExpanded((prev) => new Set(prev).add(projectId));
    document.getElementById(`project-${projectId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function deleteTask(projectId: string, taskId: string) {
    const previous = projects;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p
      )
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Task delete failed: ${res.status}`);
    } catch (err) {
      setProjects(previous);
      console.error(err);
    }
  }

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;

  const attention = useMemo(
    () =>
      buildAttentionReport(
        projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectId: p.id, projectTitle: p.title }))),
        projects.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          openTaskCount: p.tasks.filter((t) => t.status !== "DONE").length,
        })),
        new Date()
      ),
    [projects]
  );
  const now = new Date();

  return (
    <>
      <Topbar eyebrow="Operations" title="Projects" statusText={`${activeCount} active`} />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">All Projects</h2>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              New project
            </button>
          )}
        </div>

        {creating && (
          <Panel className="p-5">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="Project title..."
              className="w-full bg-panel-2 border border-line rounded-lg px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass mb-3"
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)..."
              rows={2}
              className="w-full bg-panel-2 border border-line rounded-lg px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass mb-3 resize-none"
            />
            <div className="flex items-center justify-between">
              {workspaceType === "TEAM" ? (
                <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareWithTeam}
                    onChange={(e) => setShareWithTeam(e.target.checked)}
                    className="accent-brass"
                  />
                  Share with team
                </label>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCreating(false);
                    setNewTitle("");
                    setNewDescription("");
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-brass text-white disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </Panel>
        )}

        {loading && <div className="text-sm text-muted py-8 text-center">Loading projects...</div>}

        {!loading && projects.length === 0 && !creating && (
          <Panel className="p-10 text-center">
            <div className="text-sm font-medium mb-1">No projects yet</div>
            <div className="text-xs text-muted">Create your first project to start tracking tasks.</div>
          </Panel>
        )}

        {shareError && (
          <div className="text-sm text-red-500" role="alert">
            {shareError}
          </div>
        )}

        {assignError && (
          <div className="text-sm text-red-500" role="alert">
            {assignError}
          </div>
        )}

        {!loading && attention.total > 0 && (
          <Panel className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-brass" strokeWidth={1.75} />
              <h3 className="text-sm font-medium">Needs attention</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <AttentionGroup
                label="Blocked"
                items={attention.blocked}
                detail={(i) => i.blockedReason || "No reason given"}
                onOpen={openProject}
              />
              <AttentionGroup
                label="Overdue"
                items={attention.overdue}
                detail={(i) => `${i.daysOverdue} day${i.daysOverdue === 1 ? "" : "s"} overdue`}
                onOpen={openProject}
              />
              <AttentionGroup
                label="Due soon"
                items={attention.dueSoon}
                detail={(i) => (i.dueDate ? `Due ${formatDue(i.dueDate)}` : "")}
                onOpen={openProject}
              />
            </div>
            {attention.idleProjects.length > 0 && (
              <p className="text-xs text-muted mt-4">
                No open tasks in:{" "}
                {attention.idleProjects.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ", "}
                    <button onClick={() => openProject(p.id)} className="text-ink-text hover:underline">
                      {p.title}
                    </button>
                  </span>
                ))}
              </p>
            )}
          </Panel>
        )}

        <div className="space-y-3">
          {projects.map((project) => {
            const isOpen = expanded.has(project.id);
            const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
            return (
              <Panel key={project.id} className="overflow-hidden scroll-mt-4" id={`project-${project.id}`}>
                <button
                  onClick={() => toggleExpanded(project.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted shrink-0" strokeWidth={1.75} />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted shrink-0" strokeWidth={1.75} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{project.title}</div>
                    {project.description && (
                      <div className="text-xs text-muted mt-0.5 line-clamp-1">
                        {project.description}
                      </div>
                    )}
                    <div className="text-xs text-muted mt-0.5">
                      {project.tasks.length === 0
                        ? "No tasks"
                        : `${doneCount}/${project.tasks.length} tasks done`}
                      {project.teamId && " · Shared with team"}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full whitespace-nowrap shrink-0",
                      statusTone[project.status]
                    )}
                  >
                    {statusLabel[project.status]}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-line">
                    <div className="px-5 py-3 flex items-center gap-2 border-b border-line">
                      <span className="text-[11px] text-muted mr-1">Status:</span>
                      {(["ACTIVE", "PAUSED", "DONE"] as ProjectStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateProjectStatus(project.id, s)}
                          className={cn(
                            "text-[11px] px-2.5 py-1 rounded-full",
                            project.status === s ? statusTone[s] : "text-muted hover:bg-black/[0.04]"
                          )}
                        >
                          {statusLabel[s]}
                        </button>
                      ))}
                      {members.length > 1 && project.owner.id === myId && (
                        <button
                          onClick={() => void setProjectSharing(project.id, !project.teamId)}
                          className="ml-auto text-[11px] text-brass hover:underline"
                        >
                          {project.teamId ? "Make private" : "Share with team"}
                        </button>
                      )}
                      <button
                        onClick={() => deleteProject(project.id)}
                        className={cn(
                          "flex items-center gap-1 text-[11px] text-muted hover:text-signal/80 transition-colors",
                          !(members.length > 1 && project.owner.id === myId) && "ml-auto"
                        )}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Delete project
                      </button>
                    </div>

                    <div className="divide-y divide-line">
                      {project.tasks.map((task) => {
                        const Icon = taskStatusIcon[task.status];
                        const overdue = isTaskOverdue(task, now);
                        return (
                          <div key={task.id} className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => cycleTaskStatus(project.id, task)}>
                              <Icon
                                className={cn(
                                  "w-4 h-4",
                                  task.status === "DONE" ? "text-signal" : "text-muted"
                                )}
                                strokeWidth={1.75}
                              />
                            </button>
                            <span
                              className={cn(
                                "flex-1 text-sm",
                                task.status === "DONE" && "text-muted line-through"
                              )}
                            >
                              {task.title}
                            </span>
                            {members.length > 1 && (
                              <select
                                value={task.assigneeId ?? ""}
                                onChange={(e) => void assignTask(project.id, task.id, e.target.value || null)}
                                aria-label="Assign task"
                                className={cn(
                                  "max-w-[9rem] truncate bg-transparent text-[11px] rounded-md px-1.5 py-1 border border-transparent hover:border-line focus:outline-none focus:ring-1 focus:ring-brass",
                                  task.assigneeId ? "text-ink-text" : "text-muted"
                                )}
                              >
                                <option value="">Unassigned</option>
                                {members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name || m.email || "Unnamed"}
                                  </option>
                                ))}
                              </select>
                            )}
                            {task.dueDate && task.status !== "DONE" && (
                              <span
                                className={cn(
                                  "text-[11px] whitespace-nowrap",
                                  overdue ? "text-red-500 font-medium" : "text-muted"
                                )}
                              >
                                {overdue ? "Overdue · " : ""}
                                {formatDue(task.dueDate)}
                              </span>
                            )}
                            {task.status === "BLOCKED" ? (
                              <button
                                onClick={() => void setTaskStatus(project.id, task.id, "IN_PROGRESS")}
                                className="text-[11px] text-brass hover:underline whitespace-nowrap"
                              >
                                Unblock
                              </button>
                            ) : (
                              task.status !== "DONE" && (
                                <button
                                  onClick={() => {
                                    setBlockingTaskId(task.id);
                                    setBlockReason("");
                                  }}
                                  className="text-muted hover:text-ink-text transition-colors"
                                  aria-label="Mark blocked"
                                  title="Mark blocked"
                                >
                                  <Ban className="w-3.5 h-3.5" strokeWidth={1.75} />
                                </button>
                              )
                            )}
                            <button
                              onClick={() => deleteTask(project.id, task.id)}
                              className="text-muted hover:text-signal/80 transition-colors"
                              aria-label="Delete task"
                            >
                              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                          {task.status === "BLOCKED" && (
                            <div className="text-xs text-muted mt-1 ml-7">
                              Blocked: {task.blockedReason || "no reason given"}
                            </div>
                          )}
                          {blockingTaskId === task.id && (
                            <div className="flex items-center gap-2 mt-2 ml-7">
                              <input
                                autoFocus
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") confirmBlocked(project.id, task.id);
                                  if (e.key === "Escape") setBlockingTaskId(null);
                                }}
                                maxLength={500}
                                placeholder="What is it waiting on?"
                                className="flex-1 bg-panel-2 border border-line rounded-lg px-3 py-1.5 text-xs placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"
                              />
                              <button
                                onClick={() => confirmBlocked(project.id, task.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brass text-white"
                              >
                                Mark blocked
                              </button>
                              <button
                                onClick={() => setBlockingTaskId(null)}
                                className="text-xs text-muted"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-5 py-3 flex items-center gap-2">
                      <input
                        value={newTaskInputs[project.id] ?? ""}
                        onChange={(e) =>
                          setNewTaskInputs((prev) => ({ ...prev, [project.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && addTask(project.id)}
                        placeholder="Add a task..."
                        className="flex-1 bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"
                      />
                      <input
                        type="date"
                        value={newTaskDue[project.id] ?? ""}
                        onChange={(e) =>
                          setNewTaskDue((prev) => ({ ...prev, [project.id]: e.target.value }))
                        }
                        aria-label="Due date (optional)"
                        className="bg-panel-2 border border-line rounded-lg px-2 py-2 text-xs text-muted focus:outline-none focus:ring-1 focus:ring-brass"
                      />
                      <button
                        onClick={() => addTask(project.id)}
                        className="p-2 rounded-lg bg-panel-2"
                        aria-label="Add task"
                      >
                        <Plus className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                    <ProjectEmails projectId={project.id} myId={myId} isOwner={project.owner.id === myId} />
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      </main>
    </>
  );
}
function AttentionGroup({
  label,
  items,
  detail,
  onOpen,
}: {
  label: string;
  items: AttentionItem[];
  detail: (item: AttentionItem) => string;
  onOpen: (projectId: string) => void;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">
        {label} · {items.length}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted">Nothing here.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, ATTENTION_PREVIEW).map((item) => (
            <li key={item.taskId}>
              <button onClick={() => onOpen(item.projectId)} className="text-left w-full group">
                <div className="text-sm truncate group-hover:underline">{item.title}</div>
                <div className="text-xs text-muted truncate">
                  {item.projectTitle} · {detail(item)}
                </div>
              </button>
            </li>
          ))}
          {items.length > ATTENTION_PREVIEW && (
            <li className="text-xs text-muted">and {items.length - ATTENTION_PREVIEW} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
