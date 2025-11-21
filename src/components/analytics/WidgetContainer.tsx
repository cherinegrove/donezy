import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { GripVertical, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetContainerProps {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  onRemove?: () => void;
  onExpand?: () => void;
  isDragging?: boolean;
}

export const WidgetContainer = ({ 
  children, 
  title, 
  icon,
  onRemove, 
  onExpand,
  isDragging 
}: WidgetContainerProps) => {
  return (
    <Card className={`
      group relative overflow-hidden
      bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl
      border-border/50 hover:border-primary/50
      transition-all duration-300
      ${isDragging ? 'shadow-2xl scale-105 rotate-2' : 'hover:shadow-lg'}
    `}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
            <GripVertical className="h-5 w-5" />
          </div>
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpand}
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="relative p-4">
        {children}
      </div>
    </Card>
  );
};
