import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Users, 
  Target,
  DollarSign,
  CheckCircle,
  UserCircle
} from "lucide-react";

export type WidgetType = 
  | 'metrics'
  | 'risk-success'
  | 'user-feedback'
  | 'project-status'
  | 'task-distribution'
  | 'time-tracking'
  | 'time-tracking-daily'
  | 'time-tracking-monthly'
  | 'team-performance'
  | 'budget-overview'
  | 'completion-rate'
  | 'business-hours';

interface WidgetOption {
  id: WidgetType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const widgetOptions: WidgetOption[] = [
  {
    id: 'metrics',
    name: 'Key Metrics',
    description: 'Overview of important numbers and KPIs',
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    id: 'risk-success',
    name: 'AI Pulse Check',
    description: 'AI-powered identification of risks and wins',
    icon: <AlertTriangle className="h-5 w-5" />
  },
  {
    id: 'user-feedback',
    name: 'User Performance Feedback',
    description: 'AI-powered analysis and feedback for team members',
    icon: <UserCircle className="h-5 w-5" />
  },
  {
    id: 'project-status',
    name: 'Project Status',
    description: 'Visual breakdown of project health',
    icon: <Target className="h-5 w-5" />
  },
  {
    id: 'task-distribution',
    name: 'Task Distribution',
    description: 'How tasks are spread across the team',
    icon: <CheckCircle className="h-5 w-5" />
  },
  {
    id: 'time-tracking',
    name: 'Time Tracking',
    description: 'Hours logged and time utilization',
    icon: <Clock className="h-5 w-5" />
  },
  {
    id: 'time-tracking-daily',
    name: 'Daily Time by User',
    description: 'Daily hours logged per user (line graph)',
    icon: <TrendingUp className="h-5 w-5" />
  },
  {
    id: 'time-tracking-monthly',
    name: 'Monthly Time by User',
    description: 'Monthly hours logged per user (line graph)',
    icon: <TrendingUp className="h-5 w-5" />
  },
  {
    id: 'team-performance',
    name: 'Team Performance',
    description: 'Team productivity and efficiency metrics',
    icon: <Users className="h-5 w-5" />
  },
  {
    id: 'budget-overview',
    name: 'Budget Overview',
    description: 'Budget vs actual spending analysis',
    icon: <DollarSign className="h-5 w-5" />
  },
  {
    id: 'completion-rate',
    name: 'Completion Rate',
    description: 'Track completion trends over time',
    icon: <TrendingUp className="h-5 w-5" />
  },
  {
    id: 'business-hours',
    name: 'Business Hours Report',
    description: 'Week-on-week, month-on-month & year-on-year total hours for the business',
    icon: <Clock className="h-5 w-5" />
  }
];

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (widgetType: WidgetType) => void;
}

export const AddWidgetDialog = ({ open, onOpenChange, onAddWidget }: AddWidgetDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Widget to Dashboard</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {widgetOptions.map((widget) => (
            <Button
              key={widget.id}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2 hover:border-primary"
              onClick={() => {
                onAddWidget(widget.id);
                onOpenChange(false);
              }}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {widget.icon}
                </div>
                <span className="font-semibold text-left">{widget.name}</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {widget.description}
              </p>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
