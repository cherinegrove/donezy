import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  DollarSign,
  Calendar,
  Activity
} from "lucide-react";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  color: string;
}

const templates: ReportTemplate[] = [
  {
    id: "project-status",
    name: "Project Status Overview",
    description: "View all projects by status with completion rates and deadlines",
    icon: <TrendingUp className="h-5 w-5" />,
    category: "Projects",
    color: "hsl(var(--primary))"
  },
  {
    id: "task-completion",
    name: "Task Completion Rate",
    description: "Track task completion trends over time by assignee and priority",
    icon: <CheckCircle2 className="h-5 w-5" />,
    category: "Tasks",
    color: "hsl(142 71% 45%)"
  },
  {
    id: "time-utilization",
    name: "Time Utilization",
    description: "Analyze time spent across projects and tasks vs estimates",
    icon: <Clock className="h-5 w-5" />,
    category: "Time",
    color: "hsl(217 91% 60%)"
  },
  {
    id: "team-workload",
    name: "Team Workload Distribution",
    description: "See task and hour distribution across team members",
    icon: <Users className="h-5 w-5" />,
    category: "Team",
    color: "hsl(280 50% 55%)"
  },
  {
    id: "overdue-tasks",
    name: "Overdue Tasks Report",
    description: "Identify overdue tasks by project and assignee with priority levels",
    icon: <AlertCircle className="h-5 w-5" />,
    category: "Tasks",
    color: "hsl(0 84% 60%)"
  },
  {
    id: "project-timeline",
    name: "Project Timeline",
    description: "Gantt-style view of all projects with start and end dates",
    icon: <Calendar className="h-5 w-5" />,
    category: "Projects",
    color: "hsl(24 95% 53%)"
  },
  {
    id: "productivity-trends",
    name: "Productivity Trends",
    description: "Track team and individual productivity metrics over time",
    icon: <Activity className="h-5 w-5" />,
    category: "Team",
    color: "hsl(340 82% 52%)"
  },
  {
    id: "budget-tracking",
    name: "Budget & Billing",
    description: "Monitor project budgets, actual vs estimated costs, and billing",
    icon: <DollarSign className="h-5 w-5" />,
    category: "Finance",
    color: "hsl(142 76% 36%)"
  },
  {
    id: "priority-matrix",
    name: "Priority Matrix",
    description: "Visualize tasks in urgency vs importance matrix",
    icon: <Target className="h-5 w-5" />,
    category: "Tasks",
    color: "hsl(47 96% 53%)"
  },
  {
    id: "project-health",
    name: "Project Health Score",
    description: "AI-powered health scores based on progress, risks, and team velocity",
    icon: <BarChart3 className="h-5 w-5" />,
    category: "Projects",
    color: "hsl(173 58% 39%)"
  },
  {
    id: "client-overview",
    name: "Client Project Summary",
    description: "View all projects grouped by client with status and hours",
    icon: <PieChartIcon className="h-5 w-5" />,
    category: "Clients",
    color: "hsl(215 16% 47%)"
  },
  {
    id: "milestone-tracking",
    name: "Milestone Tracking",
    description: "Track project milestones and their completion status",
    icon: <CheckCircle2 className="h-5 w-5" />,
    category: "Projects",
    color: "hsl(262 52% 47%)"
  }
];

interface PrebuiltReportTemplatesProps {
  onSelectTemplate: (templateId: string) => void;
}

export function PrebuiltReportTemplates({ onSelectTemplate }: PrebuiltReportTemplatesProps) {
  const categories = Array.from(new Set(templates.map(t => t.category)));

  return (
    <div className="space-y-6">
      {categories.map(category => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">{category} Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.filter(t => t.category === category).map(template => (
              <Card 
                key={template.id} 
                className="group hover:shadow-lg transition-all duration-300 border-border hover:border-primary/50 cursor-pointer"
                onClick={() => onSelectTemplate(template.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2.5 rounded-lg group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${template.color}15` }}
                    >
                      <div style={{ color: template.color }}>
                        {template.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold leading-tight mb-1">
                        {template.name}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {template.description}
                  </CardDescription>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 w-full group-hover:bg-primary/10"
                  >
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
