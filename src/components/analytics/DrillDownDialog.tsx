import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface DrillDownItem {
  id: string;
  name: string;
  status?: string;
  value?: number;
  metadata?: Record<string, any>;
  path?: string;
}

interface DrillDownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: DrillDownItem[];
  valueLabel?: string;
}

export function DrillDownDialog({ 
  open, 
  onOpenChange, 
  title, 
  items,
  valueLabel = "Value"
}: DrillDownDialogProps) {
  const navigate = useNavigate();

  const handleItemClick = (item: DrillDownItem) => {
    if (item.path) {
      navigate(item.path);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                  item.path ? 'cursor-pointer' : ''
                }`}
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.status && (
                        <Badge variant="outline" className="text-xs">
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    {item.metadata && (
                      <div className="mt-2 text-sm text-muted-foreground space-y-1">
                        {Object.entries(item.metadata).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value !== undefined && (
                      <div className="text-right">
                        <div className="text-2xl font-bold">{item.value}</div>
                        <div className="text-xs text-muted-foreground">{valueLabel}</div>
                      </div>
                    )}
                    {item.path && (
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No items to display
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
