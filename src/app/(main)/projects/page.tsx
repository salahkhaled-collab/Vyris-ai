"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/user-context";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Circle,
  CircleDot,
  CheckCircle2,
  X,
} from "lucide-react";

type ProjectStatus = "ACTIVE" | "PAUSED" | "DONE";
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
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
  DONE: CheckCircle2,
};

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

  function load() {
    setLoading(true);
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []))
      .finally(() => setLoading(false));
  }

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
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const task = await res.json();
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p))
      );
      setNewTaskInputs((prev) => ({ ...prev, [projectId]: "" }));
    }
  }

  async function cycleTaskStatus(projectId: string, task: Task) {
    const previous = projects;
    const status = nextTaskStatus(task.status);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) }
          : p
      )
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Task status update failed: ${res.status}`);
    } catch (err) {
      setProjects(previous);
      console.error(err);
    }
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

        <div className="space-y-3">
          {projects.map((project) => {
            const isOpen = expanded.has(project.id);
            const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
            return (
              <Panel key={project.id} className="overflow-hidden">
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
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="ml-auto flex items-center gap-1 text-[11px] text-muted hover:text-signal/80 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Delete project
                      </button>
                    </div>

                    <div className="divide-y divide-line">
                      {project.tasks.map((task) => {
                        const Icon = taskStatusIcon[task.status];
                        return (
                          <div key={task.id} className="flex items-center gap-3 px-5 py-3">
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
                            <button
                              onClick={() => deleteTask(project.id, task.id)}
                              className="text-muted hover:text-signal/80 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
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
                      <button
                        onClick={() => addTask(project.id)}
                        className="p-2 rounded-lg bg-panel-2"
                        aria-label="Add task"
                      >
                        <Plus className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
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