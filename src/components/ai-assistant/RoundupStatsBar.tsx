import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Activity } from "lucide-react";
import { ProjectRoundupData } from "@/utils/projectRoundupGenerator";

interface RoundupStatsBarProps {
  roundup: ProjectRoundupData;
}

export function RoundupStatsBar({ roundup }: RoundupStatsBarProps) {
  const stats = roundup.statistics;
  const awaitingCount = stats.blockedTasks;

  // Determine health status
  let health: "on-track" | "attention-needed" | "blocked" = "on-track";
  if (awaitingCount >= 3) {
    health = "blocked";
  } else if (awaitingCount > 0 || stats.atRiskTasks > 0) {
    health = "attention-needed";
  } else if (stats.completionPercentage < 50) {
    health = "attention-needed";
  }

  const healthConfig = {
    "on-track": { label: "On Track", color: "bg-emerald-100 text-emerald-800 border-emerald-200", emoji: "🟢" },
    "attention-needed": { label: "Needs Attention", color: "bg-amber-100 text-amber-800 border-amber-200", emoji: "🟡" },
    "blocked": { label: "Blocked", color: "bg-red-100 text-red-800 border-red-200", emoji: "🔴" },
  };
  const healthStyle = healthConfig[health];

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border flex-wrap text-sm">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span className="font-semibold text-emerald-700">{stats.completedTasks}</span>
        <span className="text-muted-foreground">completed</span>
      </div>
      <span className="text-muted-foreground">·</span>
      <div className="flex items-center gap-1.5">
        <Activity className="h-4 w-4 text-blue-600" />
        <span className="font-semibold text-blue-700">{stats.inProgressTasks}</span>
        <span className="text-muted-foreground">in progress</span>
      </div>
      <span className="text-muted-foreground">·</span>
      <div className="flex items-center gap-1.5">
        <span className="font-semibold" style={{ color: awaitingCount > 0 ? "#f97316" : "#22c55e" }}>
          {awaitingCount}
        </span>
        <span className="text-muted-foreground">blocked/waiting</span>
      </div>
      <span className="text-muted-foreground">·</span>
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-orange-600">{stats.atRiskTasks}</span>
        <span className="text-muted-foreground">at risk</span>
      </div>
      <div className="ml-auto">
        <Badge variant="outline" className={healthStyle.color}>
          {healthStyle.emoji} {healthStyle.label}
        </Badge>
      </div>
    </div>
  );
}
