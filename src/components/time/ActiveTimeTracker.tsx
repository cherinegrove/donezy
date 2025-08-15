
import { Button } from "@/components/ui/button";
import { Clock, Play, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ActiveTimeTracker() {
  const { activeTimeEntry, stopTimeTracking, deleteTimeEntry, tasks, projects, clients, getElapsedTime } = useAppContext();
  const [elapsed, setElapsed] = useState<string>("00:00:00");
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  
  const activeTask = activeTimeEntry 
    ? tasks.find(task => task.id === activeTimeEntry.taskId) 
    : null;
  
  const activeProject = activeTask 
    ? projects.find(project => project.id === activeTask.projectId)
    : null;
    
  const activeClient = activeTimeEntry 
    ? clients.find(client => client.id === activeTimeEntry.clientId)
    : null;
  
  useEffect(() => {
    if (!activeTimeEntry) return;
    
    const timer = setInterval(() => {
      setElapsed(getElapsedTime(activeTimeEntry));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [activeTimeEntry, getElapsedTime]);
  
  const handleStopTracking = () => {
    console.log('🔴 ActiveTimeTracker: handleStopTracking called');
    setStopDialogOpen(true);
  };
  
  const confirmStopTracking = () => {
    console.log('✅ ActiveTimeTracker: confirmStopTracking called with notes:', notes);
    console.log('🎯 ActiveTimeTracker: About to call stopTimeTracking function');
    
    stopTimeTracking(notes);
    
    console.log('✨ ActiveTimeTracker: stopTimeTracking function called, closing dialog');
    setStopDialogOpen(false);
    setNotes("");
  };

  const handleDeleteTimeEntry = () => {
    console.log('🗑️ ActiveTimeTracker: handleDeleteTimeEntry called');
    if (activeTimeEntry) {
      deleteTimeEntry(activeTimeEntry.id);
      setStopDialogOpen(false);
      setNotes("");
    }
  };

  if (!activeTimeEntry) return null;

  return (
    <>
      <div className="bg-green-50 dark:bg-green-900/20 py-2 px-4 border-b border-green-200 dark:border-green-800 flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4 text-green-700 dark:text-green-500" />
          <span className="mr-2 text-sm font-medium text-green-800 dark:text-green-400">
            Currently tracking:
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{activeTask?.title}</span>
            {activeProject && (
              <span className="text-xs text-green-600 dark:text-green-400">{activeProject.name}</span>
            )}
            {activeClient && (
              <span className="text-xs text-green-600/80 dark:text-green-400/80">Client: {activeClient.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-base font-mono font-bold">{elapsed}</div>
          <Button 
            size="sm" 
            variant="outline"
            className="border-red-200 bg-red-50 hover:bg-red-100 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-500 dark:hover:bg-red-900/40"
            onClick={handleStopTracking}
          >
            <Square className="mr-1 h-3 w-3" />
            Stop
          </Button>
        </div>
      </div>
      
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Time Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium mb-1">Task</p>
              <p>{activeTask?.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Time Elapsed</p>
              <p className="font-mono">{elapsed}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Notes</p>
              <Textarea 
                placeholder="What did you work on?" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={handleDeleteTimeEntry}
            >
              Delete Entry
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStopDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmStopTracking}>Save Time Entry</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
