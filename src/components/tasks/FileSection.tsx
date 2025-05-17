
import React, { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Upload, File, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FileSectionProps {
  taskId: string;
}

export function FileSection({ taskId }: FileSectionProps) {
  const { tasks, uploadTaskFile, deleteTaskFile, currentUser } = useAppContext();
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Add null check for tasks
  const safeTask = tasks && Array.isArray(tasks) ? tasks.find(t => t && t.id === taskId) : null;
  
  // Fallback if task not found
  if (!safeTask) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Task not found
      </div>
    );
  }
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;
    
    setIsUploading(true);
    try {
      await uploadTaskFile(taskId, files[0], currentUser.id);
      toast({
        title: "File uploaded",
        description: "Your file was successfully uploaded to this task.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
      console.error("File upload error:", error);
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  
  const handleDeleteFile = async (fileId: string) => {
    if (!currentUser) return;
    
    try {
      await deleteTaskFile(taskId, fileId);
      toast({
        title: "File deleted",
        description: "The file was successfully removed from this task.",
      });
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: "There was an error deleting the file. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get files for the current task
  const taskFiles = safeTask.files || [];
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Files</h3>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
        </div>
      </div>
      
      {taskFiles.length > 0 ? (
        <div className="space-y-2">
          {taskFiles.map((file) => (
            <div 
              key={file.id}
              className="flex items-center justify-between p-2 border rounded-md hover:bg-accent/10"
            >
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(file.uploadedAt), "MMM d, yyyy")} • {(file.sizeKb / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDeleteFile(file.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No files attached to this task
        </div>
      )}
    </div>
  );
}
