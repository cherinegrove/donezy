import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTeamWorkloadForDisplay, type TeamWorkloadSummary } from "@/utils/workloadCalculator";
import { useToast } from "@/hooks/use-toast";

interface WorkloadPanelProps {
  workload: TeamWorkloadSummary;
  onClose: () => void;
}

export default function WorkloadPanel({ workload, onClose }: WorkloadPanelProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    const text = formatTeamWorkloadForDisplay(workload);
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Workload report copied to clipboard",
    });
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 100) return "text-red-600 dark:text-red-400";
    if (percentage > 80) return "text-yellow-600 dark:text-yellow-400";
    if (percentage > 60) return "text-blue-600 dark:text-blue-400";
    return "text-green-600 dark:text-green-400";
  };

  const getStatusEmoji = (percentage: number) => {
    if (percentage > 100) return "🚨";
    if (percentage > 80) return "⚠️";
    if (percentage > 60) return "📊";
    return "✅";
  };

  return (
    <Card className="w-96 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Team Capacity</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Summary Stats */}
        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Team Average Utilization</span>
            <span className={`text-lg font-bold ${getUtilizationColor(workload.averageUtilization)}`}>
              {workload.averageUtilization}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-background rounded border">
              <div className="font-medium text-red-600">🚨</div>
              <div className="text-muted-foreground">Overbooked</div>
              <div className="font-bold">{workload.overbookedCount}</div>
            </div>
            <div className="p-2 bg-background rounded border">
              <div className="font-medium text-yellow-600">⚠️</div>
              <div className="text-muted-foreground">At Capacity</div>
              <div className="font-bold">{workload.atCapacityCount}</div>
            </div>
            <div className="p-2 bg-background rounded border">
              <div className="font-medium text-green-600">✅</div>
              <div className="text-muted-foreground">Available</div>
              <div className="font-bold">{workload.underutilizedCount}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <strong>{Math.round(workload.totalAvailableCapacity)}h</strong> available team capacity
          </div>
        </div>

        {/* Individual Workloads */}
        <div className="space-y-2">
          <label className="text-xs font-medium">TEAM MEMBERS</label>
          {workload.users.map((user) => {
            const utilizationBar =
              "█".repeat(Math.floor(user.utilizationPercentage / 10)) +
              "░".repeat(10 - Math.floor(user.utilizationPercentage / 10));

            return (
              <div key={user.userId} className="p-2.5 bg-muted/50 rounded-lg border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{user.userName}</span>
                  <span className={`text-sm font-bold ${getUtilizationColor(user.utilizationPercentage)}`}>
                    {getStatusEmoji(user.utilizationPercentage)} {user.utilizationPercentage}%
                  </span>
                </div>

                <div className="text-xs font-mono text-muted-foreground">{utilizationBar}</div>

                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Tasks: </span>
                    <span className="font-medium">{user.tasksInProgress}/{user.tasksCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Available: </span>
                    <span className="font-medium">{Math.round(user.availableCapacity)}h</span>
                  </div>
                </div>

                {user.riskFactors.length > 0 && (
                  <div className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                    {user.riskFactors.map((factor, i) => (
                      <div key={i}>⚠️ {factor}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        {workload.recommendations.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 space-y-1.5">
            <p className="text-sm font-medium">💡 Recommendations</p>
            <ul className="text-xs space-y-1">
              {workload.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2">
                  <span>•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Copy Button */}
        <Button
          onClick={handleCopy}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Copy Report
        </Button>
      </CardContent>
    </Card>
  );
}
