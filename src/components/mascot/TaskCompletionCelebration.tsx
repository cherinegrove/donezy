import { useEffect, useState } from 'react';
import { DonezyMascot } from './DonezyMascot';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TaskCompletionCelebrationProps {
  taskTitle?: string;
  onClose?: () => void;
}

export function TaskCompletionCelebration({ taskTitle, onClose }: TaskCompletionCelebrationProps) {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  useEffect(() => {
    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-none bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-900 dark:to-slate-800 max-w-md">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-64 h-64">
            <DonezyMascot celebrating={true} size="large" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
              🎉 Awesome!
            </h2>
            {taskTitle && (
              <p className="text-sm text-muted-foreground">
                You completed: <span className="font-semibold">{taskTitle}</span>
              </p>
            )}
            <p className="text-lg font-semibold text-foreground">
              Keep up the great work! 🚀
            </p>
          </div>

          <Button onClick={handleClose} className="mt-4">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
