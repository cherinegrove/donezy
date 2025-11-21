import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MetricData {
  label: string;
  value: string | number;
  change?: number;
  progress?: number;
  suffix?: string;
}

export const MetricsWidget = ({ metrics }: { metrics: MetricData[] }) => {
  const getTrendIcon = (change?: number) => {
    if (!change) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = (change?: number) => {
    if (!change) return "text-muted-foreground";
    return change > 0 ? "text-green-500" : "text-red-500";
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-md"
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">
              {metric.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {metric.value}
              </span>
              {metric.suffix && (
                <span className="text-sm text-muted-foreground">
                  {metric.suffix}
                </span>
              )}
            </div>
            {metric.change !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${getTrendColor(metric.change)}`}>
                {getTrendIcon(metric.change)}
                <span>{Math.abs(metric.change)}%</span>
              </div>
            )}
            {metric.progress !== undefined && (
              <Progress value={metric.progress} className="h-2" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
