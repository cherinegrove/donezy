import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";

interface WeeklyClientReportProps {
  clientId: string;
}

export const WeeklyClientReport = ({ clientId }: WeeklyClientReportProps) => {
  const { projects, tasks, timeEntries, users, clients } = useAppContext();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const client = clients.find(c => c.id === clientId);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Get this week's data
  const weeklyTimeEntries = timeEntries.filter(entry => 
    entry.clientId === clientId &&
    entry.startTime &&
    isWithinInterval(parseISO(entry.startTime), { start: weekStart, end: weekEnd })
  );

  const clientProjects = projects.filter(p => p.clientId === clientId);
  const weeklyTasks = tasks.filter(task => {
    const isClientTask = clientProjects.some(p => p.id === task.projectId);
    if (!isClientTask) return false;
    
    // Include tasks that were created or have time entries this week
    const taskCreated = task.createdAt && isWithinInterval(parseISO(task.createdAt), { start: weekStart, end: weekEnd });
    const hasTimeThisWeek = weeklyTimeEntries.some(e => e.taskId === task.id);
    return taskCreated || hasTimeThisWeek;
  });

  const completedTasks = weeklyTasks.filter(t => t.status === 'done');
  const totalHours = weeklyTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

  const generateCSVReport = () => {
    setIsGenerating(true);
    
    try {
      const weekRange = format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d, yyyy');
      
      let csv = 'Weekly Report for ' + client?.name + '\n';
      csv += 'Week: ' + weekRange + '\n';
      csv += 'Generated: ' + format(now, 'PPpp') + '\n\n';
      
      // Summary
      csv += 'SUMMARY\n';
      csv += 'Total Hours,' + (totalHours / 60).toFixed(2) + '\n';
      csv += 'Tasks Completed,' + completedTasks.length + '\n';
      csv += 'Tasks In Progress,' + weeklyTasks.filter(t => t.status === 'in-progress').length + '\n\n';
      
      // Time entries by project
      csv += 'TIME BREAKDOWN BY PROJECT\n';
      csv += 'Project,Hours\n';
      
      const projectHours: Record<string, number> = {};
      weeklyTimeEntries.forEach(entry => {
        const project = projects.find(p => p.id === entry.projectId);
        if (project) {
          projectHours[project.name] = (projectHours[project.name] || 0) + (entry.duration || 0);
        }
      });
      
      Object.entries(projectHours).forEach(([projectName, hours]) => {
        csv += projectName + ',' + (hours / 60).toFixed(2) + '\n';
      });
      csv += '\n';
      
      // Completed tasks
      csv += 'COMPLETED TASKS\n';
      csv += 'Task,Project,Completed By,Hours\n';
      
      completedTasks.forEach(task => {
        const project = projects.find(p => p.id === task.projectId);
        const assignee = users.find(u => u.id === task.assigneeId);
        const taskHours = timeEntries
          .filter(e => e.taskId === task.id && e.clientId === clientId)
          .reduce((sum, e) => sum + (e.duration || 0), 0);
        
        const taskTitle = task.title.replace(/"/g, '""');
        const projectName = project?.name || 'N/A';
        const assigneeName = assignee?.name || 'Unassigned';
        csv += '"' + taskTitle + '","' + projectName + '","' + assigneeName + '",' + (taskHours / 60).toFixed(2) + '\n';
      });
      csv += '\n';
      
      // Detailed time entries
      csv += 'DETAILED TIME ENTRIES\n';
      csv += 'Date,Project,Task,User,Hours,Notes\n';
      
      weeklyTimeEntries.forEach(entry => {
        const project = projects.find(p => p.id === entry.projectId);
        const task = tasks.find(t => t.id === entry.taskId);
        const user = users.find(u => u.id === entry.userId);
        const entryDate = format(parseISO(entry.startTime), 'yyyy-MM-dd');
        const notes = (entry.notes || '').replace(/"/g, '""');
        const projectName = project?.name || 'N/A';
        const taskTitle = task?.title || 'N/A';
        const userName = user?.name || 'N/A';
        
        csv += entryDate + ',"' + projectName + '","' + taskTitle + '","' + userName + '",' + ((entry.duration || 0) / 60).toFixed(2) + ',"' + notes + '"\n';
      });
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const filename = client?.name + '-weekly-report-' + format(weekStart, 'yyyy-MM-dd') + '.csv';
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report Generated",
        description: "Weekly report has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">{(totalHours / 60).toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedTasks.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">{weeklyTasks.filter(t => t.status === 'in-progress').length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold">{clientProjects.filter(p => p.status !== 'completed').length}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={generateCSVReport} 
              disabled={isGenerating}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Email functionality will be available soon.",
                });
              }}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Report
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Report covers {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
