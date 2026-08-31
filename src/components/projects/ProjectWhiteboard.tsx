import { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectWhiteboardProps {
  projectId: string;
}

export function ProjectWhiteboard({ projectId }: ProjectWhiteboardProps) {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const excalidrawAPI = require("@excalidraw/excalidraw");
  const Excalidraw = excalidrawAPI.Excalidraw;

  const [drawingData, setDrawingData] = useState<any>(null);

  // Load existing drawing
  useEffect(() => {
    const loadDrawing = async () => {
      try {
        const { data, error } = await supabase
          .from("project_whiteboards")
          .select("drawing_data")
          .eq("project_id", projectId)
          .maybeSingle();

        if (error) {
          console.error("Error loading whiteboard:", error);
          return;
        }

        if (data?.drawing_data) {
          setDrawingData(data.drawing_data);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDrawing();
  }, [projectId]);

  // Auto-save drawing
  const handleChange = async (elements: any, appState: any) => {
    setDrawingData({ elements, appState });

    // Auto-save after 2 seconds of inactivity
    const saveTimer = setTimeout(() => {
      saveDrawing(elements, appState);
    }, 2000);

    return () => clearTimeout(saveTimer);
  };

  const saveDrawing = async (elements: any, appState: any) => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("project_whiteboards")
        .upsert(
          {
            project_id: projectId,
            drawing_data: { elements, appState },
            created_by: currentUser.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id" }
        );

      if (error) throw error;

      toast({
        description: "Whiteboard saved",
        duration: 2000,
      });
    } catch (err) {
      console.error("Error saving whiteboard:", err);
      toast({
        description: "Failed to save whiteboard",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Project Whiteboard</h3>
          <p className="text-sm text-muted-foreground">
            Collaborate on diagrams, sketches, and ideas
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isSaving}
          onClick={() => {
            // Export functionality would go here
            toast({
              description: "Export feature coming soon",
            });
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Export"}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden h-96 bg-background">
        {typeof window !== "undefined" && Excalidraw ? (
          <Excalidraw
            initialData={drawingData}
            onChange={handleChange}
            user={{ name: currentUser?.name || "User" }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading whiteboard...
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Tip: Use Shift+Click to add comments, press 'd' for dark mode, or use the toolbar for more options
      </p>
    </div>
  );
}
