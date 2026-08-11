import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Copy, Lightbulb } from "lucide-react";
import { formatRecommendationsForDisplay, type TaskRecommendation } from "@/utils/mlTaskRouter";
import { useToast } from "@/hooks/use-toast";

interface RecommendationsPanelProps {
  recommendations: TaskRecommendation[];
  onClose: () => void;
  onAssign?: (taskId: string, userId: string) => void;
}

export default function RecommendationsPanel({
  recommendations,
  onClose,
  onAssign,
}: RecommendationsPanelProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    const text = formatRecommendationsForDisplay(recommendations);
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Recommendations copied to clipboard",
    });
  };

  const handleAssign = (taskId: string, userId: string, userName: string) => {
    onAssign?.(taskId, userId);
    toast({
      title: "Assigned",
      description: `Task assigned to ${userName}`,
    });
  };

  return (
    <Card className="w-96 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Smart Assignments
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {recommendations.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No unassigned tasks found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div key={rec.taskId} className="p-3 bg-muted/50 rounded-lg border space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{rec.taskTitle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unassigned
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {rec.confidence}%
                    </p>
                    <p className="text-xs text-muted-foreground">confidence</p>
                  </div>
                </div>

                {/* Recommended assignment */}
                <div className="bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800 space-y-1">
                  <p className="text-xs font-medium">Recommend:</p>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    👤 {rec.recommendedUserName}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {rec.reasoning.join(" • ")}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleAssign(rec.taskId, rec.recommendedUserId, rec.recommendedUserName)}
                    className="w-full h-7 text-xs mt-1"
                  >
                    Assign to {rec.recommendedUserName}
                  </Button>
                </div>

                {/* Alternative assignments */}
                {rec.alternativeUsers.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Also consider:</p>
                    {rec.alternativeUsers.map((alt) => (
                      <button
                        key={alt.userId}
                        onClick={() => handleAssign(rec.taskId, alt.userId, alt.userName)}
                        className="w-full text-left p-1.5 text-xs bg-background rounded border border-muted-foreground/20 hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{alt.userName}</span>
                        <span className="text-muted-foreground ml-2">({alt.confidence}%)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Copy button */}
        <Button onClick={handleCopy} variant="outline" size="sm" className="w-full">
          <Copy className="h-4 w-4 mr-2" />
          Copy Recommendations
        </Button>
      </CardContent>
    </Card>
  );
}
