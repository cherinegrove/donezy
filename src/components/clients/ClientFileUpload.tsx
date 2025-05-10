
import { useState, useRef } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileUp, File, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ClientFileUploadProps {
  clientId: string;
}

export const ClientFileUpload = ({ clientId }: ClientFileUploadProps) => {
  const { toast } = useToast();
  const { uploadClientFile, getClientFiles, deleteClientFile } = useAppContext();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Simulated client files (in a real app, this would come from backend)
  const clientFiles = getClientFiles ? getClientFiles(clientId) : [];
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      setFiles(Array.from(fileList));
    }
  };
  
  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate file upload with progress
      if (uploadClientFile) {
        const totalFiles = files.length;
        let completedFiles = 0;
        
        for (const file of files) {
          // Simulate progress between files
          const incrementsPerFile = 100 / totalFiles;
          
          // Simulate upload progress for this file
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 50));
            setUploadProgress(
              Math.min(
                ((completedFiles * incrementsPerFile) + 
                ((i + 1) / 10) * incrementsPerFile),
                99
              )
            );
          }
          
          await uploadClientFile(clientId, file);
          completedFiles++;
        }
        
        // Complete the upload
        setUploadProgress(100);
      }
      
      toast({
        title: "Files uploaded",
        description: `Successfully uploaded ${files.length} file(s)`,
      });
      
      setFiles([]);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      // Reset state after a delay to show 100% completion
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };
  
  const handleDelete = async (fileId: string) => {
    try {
      if (deleteClientFile) {
        await deleteClientFile(clientId, fileId);
        toast({
          title: "File deleted",
          description: "File was successfully deleted",
        });
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "An error occurred while deleting the file",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5" />
          Client Files
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="grid flex-1 gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Upload client documents, contracts, or other relevant files.
                </p>
              </div>
              <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
                {uploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-center text-muted-foreground">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Files</h4>
            
            {clientFiles && clientFiles.length > 0 ? (
              <div className="space-y-2">
                {clientFiles.map((file) => (
                  <div 
                    key={file.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.uploadedAt).toLocaleDateString()} • {file.sizeKb.toLocaleString()} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No files uploaded</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upload client files to keep track of important documents.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
