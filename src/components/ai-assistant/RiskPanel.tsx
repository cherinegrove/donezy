import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRisksForDisplay, type RiskScore } from "@/utils/riskAlertSystem";
import { useToast } from "@/hooks/use-toast";

interface RiskPanelProps {
  riskScore: RiskScore;
  onClose: () => void;
}

export default function RiskPanel({ riskScore, onClose }: RiskPanelProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    const text = formatRisksForDisplay(riskScore);
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Risk analysis copied to clipboard",
    });
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 75) return "text-red-600 dark:text-red-400";
    if (risk >= 50) return "text-orange-600 dark:text-orange-400";
    if (risk >= 25) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getRiskBgColor = (risk: number) => {
    if (risk >= 75) return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
    if (risk >= 50)
      return "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800";
    if (risk >= 25)
      return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
    return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "critical":
        return "🚨";
      case "at_risk":
        return "⚠️";
      default:
        return "✅";
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

  return (
    <Card className="w-96 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            Project Risk
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {/* Risk Score */}
        <div className={`p-3 rounded-lg border ${getRiskBgColor(riskScore.overallRisk)}`}>
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm font-medium">Risk Level</span>
            <span className={`text-2xl font-bold ${getRiskColor(riskScore.overallRisk)}`}>
              {riskScore.overallRisk}%
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${
                riskScore.overallRisk >= 75
                  ? "bg-red-600"
                  : riskScore.overallRisk >= 50
                    ? "bg-orange-600"
                    : riskScore.overallRisk >= 25
                      ? "bg-yellow-600"
                      : "bg-green-600"
              }`}
              style={{ width: `${riskScore.overallRisk}%` }}
            />
          </div>

          <div className="mt-2 text-sm font-medium">
            {getStatusEmoji(riskScore.healthStatus)} {riskScore.healthStatus.toUpperCase()}
          </div>
        </div>

        {/* Active Alerts */}
        {riskScore.alerts.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium">ACTIVE ALERTS ({riskScore.alerts.length})</label>
            {riskScore.alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="p-2.5 bg-muted/50 rounded-lg border space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getSeverityEmoji(alert.severity)} {alert.title}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>

                <div className="bg-blue-50 dark:bg-blue-950 p-1 rounded text-xs">
                  <p className="font-medium mb-0.5">💡</p>
                  <p>{alert.suggestedAction}</p>
                </div>
              </div>
            ))}
            {riskScore.alerts.length > 5 && (
              <p className="text-xs text-muted-foreground">
                ... and {riskScore.alerts.length - 5} more alerts
              </p>
            )}
          </div>
        )}

        {/* Predictions */}
        {riskScore.predictions.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 space-y-1">
            <p className="text-sm font-medium">🔮 Predictions</p>
            <ul className="text-xs space-y-0.5">
              {riskScore.predictions.map((pred, i) => (
                <li key={i} className="flex gap-2">
                  <span>•</span>
                  <span>{pred}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* No Alerts Message */}
        {riskScore.alerts.length === 0 && (
          <div className="flex items-center justify-center h-32 text-center">
            <div className="text-sm text-muted-foreground">
              ✅ Project is on track - no active alerts
            </div>
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
