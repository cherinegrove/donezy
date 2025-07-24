import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  File, 
  Download, 
  Trash2, 
  FileText, 
  Image, 
  FileArchive,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ProjectFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

interface ProjectFilesProps {
  projectId: string;
}

export function ProjectFiles({ projectId }: ProjectFilesProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // For now, just show a placeholder since the table is just created
    setFiles([]);
  }, [projectId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // For now, just show success message
      toast({
        title: "Files Ready",
        description: "File upload functionality will be available once the database is fully synced",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('text') || mimeType.includes('document')) return FileText;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return FileArchive;
    return File;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Project Files
          </CardTitle>
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.mime_type);
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-sm">{file.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(file.file_size)}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(file.uploaded_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {files.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-8">
                <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No files uploaded yet</p>
                <p className="text-sm">Click "Upload Files" to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}