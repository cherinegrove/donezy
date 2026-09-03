import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Undo2, Pencil, Eraser, Square, Circle, ArrowRight, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectWhiteboardProps {
  projectId: string;
}

type DrawingTool = "pencil" | "eraser" | "rectangle" | "circle" | "arrow" | "text";

export function ProjectWhiteboard({ projectId }: ProjectWhiteboardProps) {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [currentTool, setCurrentTool] = useState<DrawingTool>("pencil");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setIsLoading(false);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsLoading(false);
      return;
    }

    // Set canvas size to match container
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
            setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
            setIsLoading(false);
          };
          img.onerror = () => {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
            setIsLoading(false);
          };
          img.src = data.drawing_data.imageData;
        } else {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading whiteboard:", err);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
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
    } catch (err) {
      console.error("Error saving:", err);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    setIsDrawing(true);
    setStartPos(coords);

    if (currentTool === "pencil" || currentTool === "eraser") {
      ctx.strokeStyle = currentTool === "eraser" ? "#ffffff" : strokeColor;
      ctx.lineWidth = currentTool === "eraser" ? strokeWidth * 3 : strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (currentTool === "pencil" || currentTool === "eraser") {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    if (!coords) {
      setStartPos(null);
      return;
    }

    // For shapes, we need to redraw from history
    if (currentTool === "rectangle" || currentTool === "circle" || currentTool === "arrow") {
      const lastState = history[history.length - 1];
      if (lastState) {
        ctx.putImageData(lastState, 0, 0);
      }

      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = strokeWidth;

      if (currentTool === "rectangle") {
        const width = coords.x - startPos.x;
        const height = coords.y - startPos.y;
        ctx.fillRect(startPos.x, startPos.y, width, height);
        ctx.strokeRect(startPos.x, startPos.y, width, height);
      } else if (currentTool === "circle") {
        const radius = Math.sqrt(
          Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (currentTool === "arrow") {
        drawArrow(ctx, startPos.x, startPos.y, coords.x, coords.y);
      }
    }

    if (currentTool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        ctx.fillStyle = strokeColor;
        ctx.font = `${strokeWidth * 8}px Arial`;
        ctx.fillText(text, startPos.x, startPos.y);
      }
    }

    saveToHistory();
    saveDrawing();
    setStartPos(null);
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
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
          <p className="text-sm text-muted-foreground">Draw, sketch, and collaborate</p>
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
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Tools Toolbar */}
      <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg border">
        {/* Drawing Tools */}
        <div className="flex gap-1 border-r pr-3">
          <Button
            variant={currentTool === "pencil" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentTool("pencil")}
            title="Pencil"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "eraser" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentTool("eraser")}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "rectangle" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentTool("rectangle")}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "circle" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentTool("circle")}
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "arrow" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentTool("arrow")}
            title="Arrow"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentTool("text")}
            title="Text"
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        {/* Colors and Settings */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">Stroke:</label>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="h-8 w-12 rounded cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">Fill:</label>
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="h-8 w-12 rounded cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">Width:</label>
            <select
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="text-xs px-2 py-1 rounded border"
            >
              <option value="1">Thin</option>
              <option value="2">Normal</option>
              <option value="4">Thick</option>
              <option value="6">Very Thick</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white" style={{ height: "600px" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-crosshair block"
          style={{ display: "block" }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Draw shapes, add text, and collaborate. Changes auto-save.
      </p>
    </div>
  );
}
