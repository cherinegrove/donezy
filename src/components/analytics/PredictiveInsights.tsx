import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, DollarSign, Clock } from "lucide-react";
import { Project, Task, TimeEntry } from "@/types";
import { isAfter, differenceInDays, addDays } from "date-fns";

interface PredictiveInsightsProps {
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
}

export function PredictiveInsights({ projects, tasks, timeEntries }: PredictiveInsightsProps) {
  // Delay Risk Detection
  const atRiskProjects = projects.filter(project => {
    if (project.status === 'done' || !project.dueDate) return false;
    
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'done').length;
    const totalTasks = projectTasks.length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    
    const daysUntilDue = differenceInDays(new Date(project.dueDate), new Date());
    const expectedCompletion = daysUntilDue > 0 ? completionRate * 100 : 0;
    
    return daysUntilDue < 14 && completionRate < 0.7;
  });

  // Resource Burnout Detection
  const recentTimeEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.startTime);
    const sevenDaysAgo = addDays(new Date(), -7);
    return isAfter(entryDate, sevenDaysAgo);
  });

  const userWorkload = recentTimeEntries.reduce((acc, entry) => {
    if (!acc[entry.userId]) {
      acc[entry.userId] = 0;
    }
    acc[entry.userId] += (entry.duration || 0) / 60;
    return acc;
  }, {} as Record<string, number>);

  const overworkedUsers = Object.entries(userWorkload).filter(([_, hours]) => hours > 50).length;

  // Budget Overrun Prediction
  const budgetRiskProjects = projects.filter(project => {
    const allocatedHours = project.allocatedHours || 0;
    const usedHours = project.usedHours || 0;
    
    if (allocatedHours === 0) return false;
    
    const utilizationRate = usedHours / allocatedHours;
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'done').length;
    const completionRate = projectTasks.length > 0 ? completedTasks / projectTasks.length : 0;
    
    return utilizationRate > 0.8 && completionRate < 0.8;
  });

  // Overdue Tasks Trend
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === 'done') return false;
    return isAfter(new Date(), new Date(task.dueDate));
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delay Risk</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{atRiskProjects.length}</div>
          <p className="text-xs text-muted-foreground">
            Projects at risk of delay
          </p>
          {atRiskProjects.length > 0 && (
            <p className="text-xs text-orange-500 mt-2">
              Action needed: Review project timelines
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Burnout Risk</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overworkedUsers}</div>
          <p className="text-xs text-muted-foreground">
            Team members overworked (50+ hrs/week)
          </p>
          {overworkedUsers > 0 && (
            <p className="text-xs text-red-500 mt-2">
              Alert: Redistribute workload
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Risk</CardTitle>
          <DollarSign className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{budgetRiskProjects.length}</div>
          <p className="text-xs text-muted-foreground">
            Projects exceeding budget
          </p>
          {budgetRiskProjects.length > 0 && (
            <p className="text-xs text-yellow-600 mt-2">
              Warning: Monitor costs closely
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
          <Clock className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overdueTasks.length}</div>
          <p className="text-xs text-muted-foreground">
            Tasks past due date
          </p>
          {overdueTasks.length > 0 && (
            <p className="text-xs text-purple-600 mt-2">
              Priority: Address immediately
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
