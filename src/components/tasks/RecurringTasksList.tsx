import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Edit, Trash2, Play, Pause } from "lucide-react";
import { RecurringTaskDialog } from "./RecurringTaskDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RecurringTask } from "@/types/recurring";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function RecurringTasksList() {
  const { toast } = useToast();
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchRecurringTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecurringTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching recurring tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load recurring tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurringTasks();
  }, []);

  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-recurring-tasks');
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring tasks generated successfully",
      });
      
      fetchRecurringTasks();
    } catch (error: any) {
      console.error('Error generating tasks:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate tasks",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleActive = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('recurring_tasks')
        .update({ is_active: !currentStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Recurring task ${!currentStatus ? 'activated' : 'paused'}`,
      });
      
      fetchRecurringTasks();
    } catch (error: any) {
      console.error('Error toggling task:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;

    try {
      const { error } = await supabase
        .from('recurring_tasks')
        .delete()
        .eq('id', taskToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring task deleted",
      });
      
      fetchRecurringTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const getRecurrenceDescription = (task: RecurringTask) => {
    let desc = `Every ${task.recurrence_interval > 1 ? task.recurrence_interval + ' ' : ''}`;
    
    switch (task.recurrence_pattern) {
      case 'daily':
        desc += task.recurrence_interval === 1 ? 'day' : 'days';
        break;
      case 'weekly':
        desc += task.recurrence_interval === 1 ? 'week' : 'weeks';
        if (task.days_of_week && task.days_of_week.length > 0) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          desc += ` on ${task.days_of_week.map(d => dayNames[d]).join(', ')}`;
        }
        break;
      case 'monthly':
        desc += task.recurrence_interval === 1 ? 'month' : 'months';
        if (task.day_of_month) {
          desc += ` on day ${task.day_of_month}`;
        }
        break;
    }
    
    return desc;
  };

  if (loading) {
    return <div className="text-center py-8">Loading recurring tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recurring Tasks</h2>
          <p className="text-muted-foreground">Manage automatically recurring task patterns</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateTasks} disabled={generating} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Generate Now
          </Button>
          <Button onClick={() => { setEditingTask(undefined); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Recurring Task
          </Button>
        </div>
      </div>

      {recurringTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No recurring tasks configured yet.</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Recurring Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {recurringTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{task.title}</CardTitle>
                      <Badge variant={task.is_active ? "default" : "secondary"}>
                        {task.is_active ? "Active" : "Paused"}
                      </Badge>
                      <Badge variant="outline">{task.priority}</Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {getRecurrenceDescription(task)}
                    </CardDescription>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleActive(task.id, task.is_active)}
                    >
                      {task.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditingTask(task); setDialogOpen(true); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setTaskToDelete(task.id); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Next Generation:</span>
                    <p className="font-medium">{format(new Date(task.next_generation_date), 'PPP')}</p>
                  </div>
                  {task.last_generated_date && (
                    <div>
                      <span className="text-muted-foreground">Last Generated:</span>
                      <p className="font-medium">{format(new Date(task.last_generated_date), 'PPP')}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Start Date:</span>
                    <p className="font-medium">{format(new Date(task.start_date), 'PPP')}</p>
                  </div>
                  {task.end_date && (
                    <div>
                      <span className="text-muted-foreground">End Date:</span>
                      <p className="font-medium">{format(new Date(task.end_date), 'PPP')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RecurringTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchRecurringTasks}
        editTask={editingTask}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring task pattern. Tasks that have already been created will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
