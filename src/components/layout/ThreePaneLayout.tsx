import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThreePaneLayoutProps {
  center: ReactNode;
  right?: ReactNode;
  rightOpen?: boolean;
  onRightClose?: () => void;
  rightWidth?: string;
}

export function ThreePaneLayout({
  center,
  right,
  rightOpen,
  onRightClose,
  rightWidth = "w-[500px]",
}: ThreePaneLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-120px)] w-full overflow-hidden gap-0">
      {/* Center pane - workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {center}
      </div>

      {/* Right pane - detail sidebar */}
      {rightOpen && right && (
        <div className={cn("border-l border-border bg-background flex flex-col overflow-hidden", rightWidth)}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold">Details</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRightClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {right}
          </div>
        </div>
      )}
    </div>
  );
}
