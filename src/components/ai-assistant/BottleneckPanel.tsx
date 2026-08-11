import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBottlenecksForDisplay, type ProjectBottlenecks } from "@/utils/bottleneckDetector";
import { useToast } from "@/hooks/use-toast";

interface BottleneckPanelProps {
  bottlenecks: ProjectBottlenecks;
  onClose: () => void;
}

export default function BottleneckPanel({ bottlenecks, onClose }: BottleneckPanelProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    const text = formatBottlenecksForDisplay(bottlenecks);
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Bottleneck analysis copied to clipboard",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "high":
        return "text-orange-600 dark:text-orange-400";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  const getSeverityEmoji = (severity: string) => {
    switch (severity) {
      case "critical":
        return "🚨";
      case "high":
        return "⚠️";
      case "medium":
        return "⏳";
      default:
        return "ℹ️";
    }
  };

  return (
    <Card className="w-96 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Bottlenecks
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {/* Summary Stats */}
        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Critical Bottlenecks</span>
            <span className="text-lg font-bold text-red-600">
              {bottlenecks.criticalCount}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Affected Tasks</span>
            <span className="text-lg font-bold text-orange-600">
              {bottlenecks.affectedTasksCount}
            </span>
          </div>
        </div>

        {/* Bottlenecks List */}
        {bottlenecks.bottlenecks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <div className="text-sm text-muted-foreground">
              ✅ No major bottlenecks detected
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {bottlenecks.bottlenecks.slice(0, 5).map((bn, index) => (
              <div key={index} className="p-2.5 bg-muted/50 rounded-lg border space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getSeverityEmoji(bn.severity)} {bn.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bn.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${getSeverityColor(bn.severity)}`}>
                    {bn.severity.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs line-clamp-2">{bn.description}</p>

                <div className="bg-blue-50 dark:bg-blue-950 p-1.5 rounded text-xs">
                  <p className="font-medium mb-0.5">💡 Action:</p>
                  <p>{bn.resolution}</p>
                </div>

                <p className="text-xs text-red-600 dark:text-red-400">
                  ⏱️ Impact: {bn.estimatedImpact}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {bottlenecks.recommendations.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 space-y-1.5">
            <p className="text-sm font-medium">🎯 Priority Actions</p>
            <ol className="text-xs space-y-1">
              {bottlenecks.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-bold">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Unblocking Priority */}
        {bottlenecks.unblockingPriority.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="text-sm font-medium mb-1.5">🔥 Unblock These First</p>
            <ul className="text-xs space-y-0.5">
              {bottlenecks.unblockingPriority.map((task, i) => (
                <li key={i} className="flex gap-2">
                  <span>→</span>
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Copy Button */}
        <Button onClick={handleCopy} variant="outline" size="sm" className="w-full">
          <Copy className="h-4 w-4 mr-2" />
          Copy Report
        </Button>
      </CardContent>
    </Card>
  );
}
