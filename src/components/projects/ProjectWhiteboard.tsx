import { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Dynamic import with error handling
let ExcalidrawComponent: any = null;

const loadExcalidraw = async () => {
  if (ExcalidrawComponent) return ExcalidrawComponent;
  try {
    const module = await import("@excalidraw/excalidraw");
    ExcalidrawComponent = module.Excalidraw;
    return ExcalidrawComponent;
  } catch (err) {
    console.error("Failed to load Excalidraw:", err);
    return null;
  }
};

interface ProjectWhiteboardProps {
  projectId: string;
}

export function ProjectWhiteboard({ projectId }: ProjectWhiteboardProps) {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [Excalidraw, setExcalidraw] = useState<any>(null);
  const [drawingData, setDrawingData] = useState<any>(null);

  // Load Excalidraw and drawing data
  useEffect(() => {
    const init = async () => {
      try {
        // Load Excalidraw component
        const ExcalidrawComp = await loadExcalidraw();
        setExcalidraw(ExcalidrawComp);

        // Load existing drawing
        const { data } = await supabase
          .from("project_whiteboards")
          .select("drawing_data")
          .eq("project_id", projectId)
          .maybeSingle();

        if (data?.drawing_data) {
          setDrawingData(data.drawing_data);
        }
      } catch (err) {
        console.error("Error initializing whiteboard:", err);
        toast({
          title: "Error",
          description: "Failed to load whiteboard",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [projectId, toast]);

  const handleChange = async (elements: any, appState: any) => {
    const data = { elements, appState };
    setDrawingData(data);

    // Auto-save after 2 seconds
    const timer = setTimeout(async () => {
      if (!currentUser) return;
      try {
        await supabase
          .from("project_whiteboards")
          .upsert(
            {
              project_id: projectId,
              drawing_data: data,
              created_by: currentUser.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "project_id" }
          );
      } catch (err) {
        console.error("Error saving:", err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center border rounded-lg bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading whiteboard...</p>
        </div>
      </div>
    );
  }

  if (!Excalidraw) {
    return (
      <div className="flex h-96 items-center justify-center border rounded-lg bg-muted/20">
        <div className="text-center">
          <p className="text-muted-foreground">Unable to load whiteboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Project Whiteboard</h3>
        <p className="text-sm text-muted-foreground">
          Collaborate on diagrams, sketches, and ideas
        </p>
      </div>
      <div className="border rounded-lg overflow-hidden h-[600px] bg-background">
        <Excalidraw
          initialData={drawingData}
          onChange={handleChange}
          user={{ name: currentUser?.name || "User" }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        💡 Tip: Drawings are auto-saved. Use 'd' for dark mode, Shift+Click for comments.
      </p>
    </div>
  );
}
