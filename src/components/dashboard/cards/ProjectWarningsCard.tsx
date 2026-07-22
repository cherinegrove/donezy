import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

export function ProjectWarningsCard() {
  const { projects, tasks, timeEntries, currentUser } = useAppContext();

  const projectWarnings = useMemo(() => {
    const warnings = [];

    const userProjects = projects.filter(
      (p) =>
        p.ownerId === currentUser?.id ||
        p.collaboratorIds?.includes(currentUser?.id) ||
        p.teamIds?.some((teamId) =>
          tasks.some(
            (t) =>
              t.projectId === p.id &&
              t.assigneeId === currentUser?.id
          )
        )
    );

    userProjects.forEach((project) => {
      if (!project.allocatedHours) return;

      // Calculate hours tracked on this project
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const trackedHours = (timeEntries || [])
        .filter((entry) =>
          projectTasks.some((task) => task.id === entry.taskId)
        )
        .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60; // convert to hours

      const percentageUsed = (trackedHours / project.allocatedHours) * 100;

      // Show warnings for projects using > 80% of hours or over budget
      if (percentageUsed >= 80) {
        warnings.push({
          projectId: project.id,
          projectName: project.name,
          allocatedHours: project.allocatedHours,
          trackedHours: Math.round(trackedHours * 10) / 10,
          percentageUsed: Math.round(percentageUsed),
          status: percentageUsed > 100 ? "over" : "warning",
        });
      }
    });

    return warnings.sort((a, b) => b.percentageUsed - a.percentageUsed);
  }, [projects, tasks, timeEntries, currentUser?.id]);

  if (projectWarnings.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
            <AlertTriangle className="h-5 w-5" />
            Project Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-6 text-muted-foreground">
            All projects within budget
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
          <AlertTriangle className="h-5 w-5" />
          Project Hours ({projectWarnings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {projectWarnings.map((warning) => (
            <div
              key={warning.projectId}
              className="p-3 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-white dark:bg-slate-800"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{warning.projectName}</p>
                <Badge
                  variant={
                    warning.status === "over"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {warning.percentageUsed}%
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      warning.status === "over"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                    style={{ width: `${Math.min(warning.percentageUsed, 100)}%` }}
                  />
                </div>
              </div>

              {/* Hours Info */}
              <p className="text-xs text-muted-foreground">
                {warning.trackedHours}h of {warning.allocatedHours}h
                {warning.status === "over" &&
                  ` (${warning.trackedHours - warning.allocatedHours}h over)`}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
