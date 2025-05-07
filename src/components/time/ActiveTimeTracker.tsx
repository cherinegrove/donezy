
import { Button } from "@/components/ui/button";
import { Clock, Play, Stop } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ActiveTimeTracker() {
  const { activeTimeEntry, stopTimeTracking, tasks } = useAppContext();
  const [elapsed, setElapsed] = useState<string>("00:00:00");
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  
  const activeTask = activeTimeEntry 
    ? tasks.find(task => task.id === activeTimeEntry.taskId) 
    : null;
  
  useEffect(() => {
    if (!activeTimeEntry) return;
    
    const startTime = new Date(activeTimeEntry.startTime).getTime();
    
    const timer = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const seconds = Math.floor((elapsedMs / 1000) % 60);
      const minutes = Math.floor((elapsedMs / (1000 * 60)) % 60);
      const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
      
      setElapsed(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);
    
    return () => clearInterval(timer);
  }, [activeTimeEntry]);
  
  const handleStopTracking = () => {
    setStopDialogOpen(true);
  };
  
  const confirmStopTracking = () => {
    stopTimeTracking(notes);
    setStopDialogOpen(false);
    setNotes("");
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
          <span className="text-sm font-medium">{activeTask?.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-base font-mono font-bold">{elapsed}</div>
          <Button 
            size="sm" 
            variant="outline"
            className="border-red-200 bg-red-50 hover:bg-red-100 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-500 dark:hover:bg-red-900/40"
            onClick={handleStopTracking}
          >
            <Stop className="mr-1 h-3 w-3" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmStopTracking}>Save Time Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
