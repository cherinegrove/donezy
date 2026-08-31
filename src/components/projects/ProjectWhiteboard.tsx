import { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectWhiteboardProps {
  projectId: string;
}

export function ProjectWhiteboard({ projectId }: ProjectWhiteboardProps) {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
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

  const saveDrawing = async (drawing: any) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from("project_whiteboards")
        .upsert(
          {
            project_id: projectId,
            drawing_data: drawing,
            created_by: currentUser.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id" }
        );

      if (error) throw error;
    } catch (err) {
      console.error("Error saving whiteboard:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Project Whiteboard
            </CardTitle>
            <CardDescription>
              Collaborate on diagrams, sketches, and ideas for {projectId}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex h-96 items-center justify-center border rounded-lg bg-muted/20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading whiteboard...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg bg-muted/30 p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <Lightbulb className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h4 className="font-semibold mb-1">Whiteboard Coming Soon</h4>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    The collaborative whiteboard tool is being optimized for your workspace. Check back shortly!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>✨ What's coming:</strong> Full drawing canvas, real-time collaboration, export options, and comments on sketches.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
