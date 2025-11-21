import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Mail } from "lucide-react";
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

  const generateEmailReport = () => {
    setIsGenerating(true);
    
    try {
      const weekRange = format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d, yyyy');
      
      // Get all tasks for this client
      const allClientTasks = tasks.filter(task => 
        clientProjects.some(p => p.id === task.projectId)
      );

      // Filter by status
      const statusGroups = {
        'backlog': allClientTasks.filter(t => t.status === 'backlog'),
        'todo': allClientTasks.filter(t => t.status === 'todo'),
        'in-progress': allClientTasks.filter(t => t.status === 'in-progress'),
        'review': allClientTasks.filter(t => t.status === 'review'),
      };

      const statusLabels = {
        'backlog': 'Backlog',
        'todo': 'Up Next',
        'in-progress': 'In Progress',
        'review': 'Awaiting Feedback',
      };
      
      let email = 'Subject: Weekly Update - ' + client?.name + ' (' + weekRange + ')\n\n';
      email += 'Hi Team,\n\n';
      email += 'Here is your weekly update for ' + weekRange + '.\n\n';
      
      // Summary
      email += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      email += 'SUMMARY\n';
      email += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      email += '• Total Hours This Week: ' + (totalHours / 60).toFixed(1) + ' hours\n';
      email += '• Tasks Completed: ' + completedTasks.length + '\n';
      email += '• Active Projects: ' + clientProjects.filter(p => p.status !== 'completed').length + '\n\n';
      
      // Tasks by status
      (Object.keys(statusGroups) as Array<keyof typeof statusGroups>).forEach(status => {
        const statusTasks = statusGroups[status];
        if (statusTasks.length > 0) {
          email += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
          email += statusLabels[status].toUpperCase() + ' (' + statusTasks.length + ')\n';
          email += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
          
          statusTasks.forEach((task, index) => {
            const project = projects.find(p => p.id === task.projectId);
            const assignee = users.find(u => u.id === task.assigneeId);
            const taskHours = timeEntries
              .filter(e => e.taskId === task.id && e.startTime && 
                isWithinInterval(parseISO(e.startTime), { start: weekStart, end: weekEnd }))
              .reduce((sum, e) => sum + (e.duration || 0), 0);
            
            email += (index + 1) + '. ' + task.title + '\n';
            email += '   Project: ' + (project?.name || 'N/A') + '\n';
            email += '   Assigned: ' + (assignee?.name || 'Unassigned') + '\n';
            email += '   Priority: ' + task.priority.toUpperCase() + '\n';
            if (task.dueDate) {
              email += '   Due: ' + format(parseISO(task.dueDate), 'MMM d, yyyy') + '\n';
            }
            if (taskHours > 0) {
              email += '   Hours This Week: ' + (taskHours / 60).toFixed(1) + 'h\n';
            }
            if (task.description) {
              email += '   Notes: ' + task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '') + '\n';
            }
            email += '\n';
          });
        }
      });
      
      email += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      email += 'Best regards,\n';
      email += 'Your Team\n';
      
      // Copy to clipboard
      navigator.clipboard.writeText(email).then(() => {
        toast({
          title: "Email Copied",
          description: "The email report has been copied to your clipboard.",
        });
      }).catch(() => {
        // Fallback - show in a textarea
        const textarea = document.createElement('textarea');
        textarea.value = email;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        toast({
          title: "Email Copied",
          description: "The email report has been copied to your clipboard.",
        });
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate email report.",
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
              onClick={generateEmailReport} 
              disabled={isGenerating}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Email Report
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Send directly via email coming soon.",
                });
              }}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email
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
