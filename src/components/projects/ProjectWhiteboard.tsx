import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectWhiteboardProps {
  projectId: string;
}

export function ProjectWhiteboard({ projectId }: ProjectWhiteboardProps) {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Load existing drawing
    const loadDrawing = async () => {
      try {
        const { data } = await supabase
          .from("project_whiteboards")
          .select("drawing_data")
          .eq("project_id", projectId)
          .maybeSingle();

        if (data?.drawing_data?.imageData) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            saveToHistory();
          };
          img.src = data.drawing_data.imageData;
        } else {
          // Clear canvas (white background)
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          saveToHistory();
        }
      } catch (err) {
        console.error("Error loading whiteboard:", err);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
      } finally {
        setIsLoading(false);
      }
    };

    loadDrawing();
  }, [projectId]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, imageData]);
  };

  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentUser) return;

    try {
      await supabase
        .from("project_whiteboards")
        .upsert(
          {
            project_id: projectId,
            drawing_data: {
              imageData: canvas.toDataURL("image/png"),
            },
            created_by: currentUser.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id" }
        );

      toast({
        description: "Whiteboard saved",
        duration: 2000,
      });
    } catch (err) {
      console.error("Error saving:", err);
      toast({
        description: "Failed to save whiteboard",
        variant: "destructive",
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    saveToHistory();
    saveDrawing();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    saveDrawing();
  };

  const handleUndo = () => {
    if (history.length <= 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    const previousState = newHistory[newHistory.length - 1];
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
    }
    saveDrawing();
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center border rounded-lg bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Project Whiteboard</h3>
          <p className="text-sm text-muted-foreground">
            Draw, sketch, and collaborate
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={history.length <= 1}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full cursor-crosshair block"
          style={{ height: "600px", display: "block" }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Drawings are auto-saved. Use Undo to revert, Clear to start fresh.
      </p>
    </div>
  );
}
