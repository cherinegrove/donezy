import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Clock } from "lucide-react";

interface EditTimerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adjustedElapsedMs: number, notes: string) => Promise<void>;
  taskTitle: string;
  originalElapsedMs: number;
  initialNotes?: string;
  isSaving?: boolean;
}

export function EditTimerDialog({
  isOpen,
  onClose,
  onConfirm,
  taskTitle,
  originalElapsedMs,
  initialNotes = "",
  isSaving = false,
}: EditTimerDialogProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [notes, setNotes] = useState(initialNotes);

  // Initialize from original elapsed time when dialog opens
  useEffect(() => {
    if (isOpen) {
      const totalMinutes = Math.floor(originalElapsedMs / (1000 * 60));
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      setHours(h);
      setMinutes(m);
      setNotes(initialNotes);
    }
  }, [isOpen, originalElapsedMs, initialNotes]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor((ms / 1000) % 60);
    const mins = Math.floor((ms / (1000 * 60)) % 60);
    const hrs = Math.floor(ms / (1000 * 60 * 60));
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const adjustedElapsedMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
  const originalFormattedTime = formatTime(originalElapsedMs);
  const adjustedFormattedTime = formatTime(adjustedElapsedMs);
  const isDifferent = adjustedElapsedMs !== originalElapsedMs;

  const handleConfirm = async () => {
    await onConfirm(adjustedElapsedMs, notes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Adjust Time Before Save
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Title */}
          <div>
            <p className="text-sm font-medium mb-1">Task</p>
            <p className="text-sm text-foreground">{taskTitle}</p>
          </div>

          {/* Original vs Adjusted Time */}
          <div className="space-y-3 bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Original time:</span>
              <span className="font-mono font-bold text-sm">{originalFormattedTime}</span>
            </div>
            {isDifferent && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Adjusted time:</span>
                <span className="font-mono font-bold text-sm text-primary">{adjustedFormattedTime}</span>
              </div>
            )}
          </div>

          {/* Time Input - Hours and Minutes */}
          <div className="space-y-2">
            <Label>Adjust Time</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hours" className="text-xs text-muted-foreground mb-1 block">
                  Hours
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="999"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={isSaving}
                  className="text-center font-mono"
                />
              </div>
              <div>
                <Label htmlFor="minutes" className="text-xs text-muted-foreground mb-1 block">
                  Minutes
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setMinutes(Math.min(59, Math.max(0, val)));
                  }}
                  disabled={isSaving}
                  className="text-center font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about your work..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Time Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
