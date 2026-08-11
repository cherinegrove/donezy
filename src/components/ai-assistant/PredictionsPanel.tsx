import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Copy, TrendingUp } from "lucide-react";
import { formatMetricsForDisplay, type ProjectMetrics } from "@/utils/predictiveAnalytics";
import { useToast } from "@/hooks/use-toast";

interface PredictionsPanelProps {
  metrics: ProjectMetrics;
  onClose: () => void;
}

export default function PredictionsPanel({ metrics, onClose }: PredictionsPanelProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    const text = formatMetricsForDisplay(metrics);
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Prediction analysis copied to clipboard",
    });
  };

  const getHealthEmoji = (status: string) => {
    switch (status) {
      case "on-track":
        return "✅";
      case "at-risk":
        return "⚠️";
      case "delayed":
        return "🚨";
      default:
        return "📊";
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case "on-track":
        return "text-green-600 dark:text-green-400";
      case "at-risk":
        return "text-orange-600 dark:text-orange-400";
      case "delayed":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  const getHealthBgColor = (status: string) => {
    switch (status) {
      case "on-track":
        return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
      case "at-risk":
        return "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800";
      case "delayed":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
      default:
        return "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <Card className="w-96 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Predictions
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {/* Current Progress */}
        <div className="space-y-2">
          <label className="text-xs font-medium">CURRENT PROGRESS</label>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Completion</span>
              <span className="text-lg font-bold text-blue-600">{metrics.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${metrics.completionPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedTasks}/{metrics.totalTasks} tasks complete
            </p>
          </div>
        </div>

        {/* Velocity Metrics */}
        <div className="bg-muted/50 p-3 rounded-lg border space-y-2">
          <label className="text-xs font-medium">VELOCITY</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Tasks/Week</p>
              <p className="text-lg font-bold">{metrics.completionVelocity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Hours/Week</p>
              <p className="text-lg font-bold">{metrics.burnRate}h</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Avg Task Duration</p>
            <p className="text-lg font-bold">{metrics.averageTaskDuration}h</p>
          </div>
        </div>

        {/* Predictions */}
        <div className={`p-3 rounded-lg border ${getHealthBgColor(metrics.healthStatus)} space-y-2`}>
          <label className="text-xs font-medium">PREDICTION</label>

          <div className="space-y-1">
            <p className="text-sm">
              <span className={getHealthColor(metrics.healthStatus)}>
                {getHealthEmoji(metrics.healthStatus)}
              </span>
              <span className="font-semibold ml-2">{metrics.healthStatus.toUpperCase()}</span>
            </p>

            <p className="text-xs text-muted-foreground">
              Projected: <span className="font-semibold">{metrics.projectedDueDate}</span>
            </p>

            {metrics.actualDueDate && (
              <p className="text-xs text-muted-foreground">
                Due: <span className="font-semibold">{metrics.actualDueDate}</span>
              </p>
            )}

            {metrics.variance !== 0 && (
              <p className={`text-xs font-semibold ${metrics.variance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {metrics.variance > 0 ? "🚨" : "✅"} {metrics.variance > 0 ? "+" : ""}{metrics.variance} days
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Confidence: {metrics.confidence}%
          </p>

          <p className="text-xs text-muted-foreground">
            ~{metrics.projectedCompletionDays} days remaining
          </p>
        </div>

        {/* Risk Factors */}
        {metrics.riskFactors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800 space-y-1.5">
            <p className="text-sm font-medium">⚠️ Risk Factors</p>
            <ul className="text-xs space-y-0.5">
              {metrics.riskFactors.map((rf, i) => (
                <li key={i} className="flex gap-2">
                  <span>•</span>
                  <span>{rf}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {metrics.riskFactors.length === 0 && (
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium">✅ On track with no major risk factors</p>
          </div>
        )}

        {/* Copy Button */}
        <Button onClick={handleCopy} variant="outline" size="sm" className="w-full">
          <Copy className="h-4 w-4 mr-2" />
          Copy Analysis
        </Button>
      </CardContent>
    </Card>
  );
}
