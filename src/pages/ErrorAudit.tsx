import { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { getRecentErrors, getErrorSummary } from "@/utils/errorLogger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  severity: string;
  created_at: string;
  endpoint?: string;
  user_id?: string;
  resolved: boolean;
}

export function ErrorAudit() {
  const { currentUser } = useAppContext();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    loadErrors();
  }, [timeRange]);

  const loadErrors = async () => {
    setIsLoading(true);
    const [recentErrors, errorSummary] = await Promise.all([
      getRecentErrors(100),
      getErrorSummary(timeRange),
    ]);
    setErrors(recentErrors as ErrorLog[]);
    setSummary(errorSummary);
    setIsLoading(false);
  };

  const totalErrors = errors.length;
  const criticalErrors = errors.filter((e) => e.severity === "critical").length;
  const unresolvedErrors = errors.filter((e) => !e.resolved).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "error":
        return "bg-orange-100 text-orange-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Error Audit Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and track application errors in real-time
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last {timeRange} hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {criticalErrors}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unresolvedErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending investigation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Error Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique error types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={timeRange === 24 ? "default" : "outline"}
          onClick={() => setTimeRange(24)}
          size="sm"
        >
          Last 24h
        </Button>
        <Button
          variant={timeRange === 168 ? "default" : "outline"}
          onClick={() => setTimeRange(168)}
          size="sm"
        >
          Last 7 days
        </Button>
        <Button
          variant={timeRange === 720 ? "default" : "outline"}
          onClick={() => setTimeRange(720)}
          size="sm"
        >
          Last 30 days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={loadErrors}
          className="ml-auto"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Error Summary by Type */}
      {summary.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Error Summary by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <p className="font-medium">{item.error_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} occurrences
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{item.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading errors...
            </div>
          ) : errors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No errors in this time period ✨
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(
                          error.severity
                        )}`}
                      >
                        {error.severity?.toUpperCase() || "ERROR"}
                      </span>
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {error.error_type}
                      </span>
                    </div>
                    {error.resolved && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Resolved
                      </span>
                    )}
                  </div>

                  <p className="text-sm mb-2">{error.error_message}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="space-x-3">
                      {error.endpoint && <span>📍 {error.endpoint}</span>}
                      {error.user_id && <span>👤 User: {error.user_id}</span>}
                    </div>
                    <span>
                      {new Date(error.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
