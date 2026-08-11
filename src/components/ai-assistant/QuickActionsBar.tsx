import { Button } from "@/components/ui/button";
import {
  BarChart3,
  AlertCircle,
  Users,
  Zap,
  TrendingUp,
  BookOpen,
  Upload,
} from "lucide-react";

interface QuickActionsBarProps {
  onRoundupClick: () => void;
  onBottleneckClick: () => void;
  onWorkloadClick: () => void;
  onRiskClick: () => void;
  onPredictionClick: () => void;
  onDecisionClick: () => void;
  onImportClick: () => void;
}

export default function QuickActionsBar({
  onRoundupClick,
  onBottleneckClick,
  onWorkloadClick,
  onRiskClick,
  onPredictionClick,
  onDecisionClick,
  onImportClick,
}: QuickActionsBarProps) {
  const actions = [
    {
      label: "Roundup",
      icon: BarChart3,
      onClick: onRoundupClick,
      color: "text-blue-500",
      description: "Project status report",
    },
    {
      label: "Bottlenecks",
      icon: AlertCircle,
      onClick: onBottleneckClick,
      color: "text-red-500",
      description: "Find blockers",
    },
    {
      label: "Workload",
      icon: Users,
      onClick: onWorkloadClick,
      color: "text-green-500",
      description: "Team capacity",
    },
    {
      label: "Risk",
      icon: Zap,
      onClick: onRiskClick,
      color: "text-orange-500",
      description: "Health check",
    },
    {
      label: "Predict",
      icon: TrendingUp,
      onClick: onPredictionClick,
      color: "text-purple-500",
      description: "Completion date",
    },
    {
      label: "Decisions",
      icon: BookOpen,
      onClick: onDecisionClick,
      color: "text-indigo-500",
      description: "Past decisions",
    },
    {
      label: "Import",
      icon: Upload,
      onClick: onImportClick,
      color: "text-cyan-500",
      description: "Create from file",
    },
  ];

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        Quick Actions
      </p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              onClick={action.onClick}
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2"
            >
              <Icon className={`h-4 w-4 ${action.color}`} />
              <span className="text-xs font-medium">{action.label}</span>
              <span className="text-xs text-muted-foreground">{action.description}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
