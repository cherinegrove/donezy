import type { User, Project, Task, TimeEntry, Client } from "@/types";
import { getEffectiveScope } from "@/lib/rbac";

function isCurrentUser(user: User, subjectId: string | undefined): boolean {
  if (!subjectId) return false;
  return subjectId === user.id || subjectId === user.auth_user_id;
}

function isProjectMember(user: User, project: Project): boolean {
  const uid = user.id;
  const authUid = user.auth_user_id;

  if (
    project.ownerId &&
    (project.ownerId === uid || project.ownerId === authUid)
  )
    return true;

  if (project.collaboratorIds?.some((id) => id === uid || id === authUid))
    return true;

  if (project.watcherIds?.some((id) => id === uid || id === authUid))
    return true;

  if (user.teamIds?.length && project.teamIds?.length) {
    if (project.teamIds.some((tid) => user.teamIds!.includes(tid))) return true;
  }

  return false;
}

export function filterProjectsByScope(
  projects: Project[],
  user: User | null | undefined,
): Project[] {
  if (!user) return [];

  const scope = getEffectiveScope(user, "projects", "view");
  if (!scope) return [];
  if (scope === "all") return projects;

  if (scope === "project") {
    return projects.filter((p) => isProjectMember(user, p));
  }

  return projects.filter(
    (p) => p.ownerId === user.id || p.ownerId === user.auth_user_id,
  );
}

export function filterTasksByScope(
  tasks: Task[],
  user: User | null | undefined,
  projectsMap?: Record<string, Project>,
): Task[] {
  if (!user) return [];

  const scope = getEffectiveScope(user, "tasks", "view");
  if (!scope) return [];
  if (scope === "all") return tasks;

  if (scope === "project") {
    return tasks.filter((task) => {
      const project = projectsMap?.[task.projectId];
      if (project && isProjectMember(user, project)) return true;

      if (isCurrentUser(user, task.assigneeId)) return true;
      if (task.collaboratorIds?.some((id) => isCurrentUser(user, id)))
        return true;

      return false;
    });
  }

  return tasks.filter(
    (task) =>
      isCurrentUser(user, task.assigneeId) ||
      task.collaboratorIds?.some((id) => isCurrentUser(user, id)),
  );
}

export function filterTimeEntriesByScope(
  entries: TimeEntry[],
  user: User | null | undefined,
  projectsMap?: Record<string, Project>,
): TimeEntry[] {
  if (!user) return [];

  const scope = getEffectiveScope(user, "time_entries", "view");
  if (!scope) return [];
  if (scope === "all") return entries;

  if (scope === "project") {
    return entries.filter((entry) => {
      if (isCurrentUser(user, entry.userId)) return true;
      if (entry.authUserId && isCurrentUser(user, entry.authUserId))
        return true;

      if (entry.projectId) {
        const project = projectsMap?.[entry.projectId];
        if (project && isProjectMember(user, project)) return true;
      }

      return false;
    });
  }

  return entries.filter(
    (entry) =>
      isCurrentUser(user, entry.userId) ||
      (entry.authUserId ? isCurrentUser(user, entry.authUserId) : false),
  );
}

export function filterClientsByScope(
  clients: Client[],
  user: User | null | undefined,
  clientProjectsMap?: Record<string, Project[]>,
): Client[] {
  if (!user) return [];

  const scope = getEffectiveScope(user, "clients", "view");
  if (!scope) return [];
  if (scope === "all") return clients;

  if (scope === "project") {
    return clients.filter((client) => {
      const projects = clientProjectsMap?.[client.id] ?? [];
      return projects.some((p) => isProjectMember(user, p));
    });
  }

  return clients.filter((client) => client.id === user.clientId);
}
