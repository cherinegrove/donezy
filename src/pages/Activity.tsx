import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { format, isToday } from "date-fns";
import { QuickCheckInDialog } from "@/components/dashboard/QuickCheckInDialog";

interface TaskLog {
  id: string;
  action: string;
  timestamp: string;
  user_id: string;
  task_id: string;
  details: any;
}

interface CheckIn {
  id: string;
  user_id: string;
  date: string;
  yesterday: string | null;
  today: string;
  blockers: string | null;
  created_at: string;
}

export default function Activity() {
  const { users } = useAppContext();
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);

  useEffect(() => {
    loadActivityData();
    setupRealtimeSubscriptions();
  }, []);

  const setupRealtimeSubscriptions = () => {
    const taskLogsChannel = supabase
      .channel('task-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_logs'
        },
        () => loadActivityData()
      )
      .subscribe();

    const checkInsChannel = supabase
      .channel('check-ins-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins'
        },
        () => loadActivityData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskLogsChannel);
      supabase.removeChannel(checkInsChannel);
    };
  };

  const loadActivityData = async () => {
    setLoading(true);
    try {
      // Load recent task logs (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: logs } = await supabase
        .from("task_logs")
        .select("*")
        .gte("timestamp", sevenDaysAgo.toISOString())
        .order("timestamp", { ascending: false })
        .limit(50);

      // Load today's check-ins
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCheckIns } = await supabase
        .from("check_ins")
        .select("*")
        .gte("date", today)
        .order("created_at", { ascending: false });

      setTaskLogs(logs || []);
      setCheckIns(todayCheckIns || []);
    } catch (error) {
      console.error("Error loading activity data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || "Unknown User";
  };

  const getActionIcon = (action: string) => {
    if (action.includes("created")) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (action.includes("updated")) return <AlertCircle className="h-4 w-4 text-blue-500" />;
    return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Feed</h1>
          <p className="text-muted-foreground mt-1">
            See what your team is working on
          </p>
        </div>
        <Button onClick={() => setShowCheckInDialog(true)}>
          Post Check-in
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Today's Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : checkIns.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No check-ins yet today. Be the first!
                </p>
              ) : (
                <div className="space-y-4">
                  {checkIns.map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className="p-4 rounded-lg bg-muted/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getUserName(checkIn.user_id)}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(checkIn.created_at), "h:mm a")}
                        </span>
                      </div>
                      
                      {checkIn.yesterday && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Yesterday:</span>
                          <p className="mt-1">{checkIn.yesterday}</p>
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <span className="text-muted-foreground">Today:</span>
                        <p className="mt-1">{checkIn.today}</p>
                      </div>
                      
                      {checkIn.blockers && (
                        <div className="text-sm">
                          <Badge variant="destructive" className="mr-2">Blocker</Badge>
                          <span>{checkIn.blockers}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : taskLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {taskLogs.map((log, index) => (
                    <div key={log.id}>
                      <div className="flex gap-3">
                        <div className="mt-1">{getActionIcon(log.action)}</div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">{getUserName(log.user_id)}</span>{" "}
                            <span className="text-muted-foreground">{log.action}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isToday(new Date(log.timestamp))
                              ? format(new Date(log.timestamp), "h:mm a")
                              : format(new Date(log.timestamp), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      {index < taskLogs.length - 1 && <Separator className="my-3" />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <QuickCheckInDialog
        open={showCheckInDialog}
        onOpenChange={setShowCheckInDialog}
      />
    </div>
  );
}