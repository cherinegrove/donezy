import React, { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { File, Trash2, Link as LinkIcon, ExternalLink, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskFile } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileSectionProps {
  taskId: string;
}

export function FileSection({ taskId }: FileSectionProps) {
  const { tasks, addTaskExternalLink, deleteTaskFile } = useAppContext();
  const { toast } = useToast();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const task = tasks.find(t => t.id === taskId);
  const files = task?.files || [];
  
  console.log('🔍 FileSection - taskId:', taskId);
  console.log('🔍 FileSection - task found:', !!task);
  console.log('🔍 FileSection - files:', files);
  console.log('🔍 FileSection - files length:', files.length);

  const handleAddLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) {
      toast({
        title: "Invalid input",
        description: "Please provide both a name and URL for the link.",
        variant: "destructive",
      });
      return;
    }

    console.log('🔗 Adding link:', { taskId, linkName, linkUrl });

    try {
      await addTaskExternalLink(taskId, linkName, linkUrl);
      console.log('✅ Link added successfully');
      toast({
        title: "Link added",
        description: `${linkName} has been added successfully.`,
      });
      setLinkName("");
      setLinkUrl("");
      setIsLinkDialogOpen(false);
    } catch (error) {
      console.error('❌ Error adding link:', error);
      toast({
        title: "Failed to add link",
        description: "There was an error adding the link.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = (fileId: string) => {
    deleteTaskFile(taskId, fileId);
    toast({
      title: "File deleted",
      description: "The file has been removed from the task.",
    });
  };

  const handleOpenLink = (url: string) => {
    // Ensure URL has a protocol
    const formattedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    window.open(formattedUrl, '_blank', 'noopener,noreferrer');
  };

  const getFileIcon = (file: TaskFile) => {
    if (file.isExternalLink) {
      return <ExternalLink className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="h-5 w-5" />
          Files & Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LinkIcon className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add External Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="link-name">Link Name</Label>
                  <Input
                    id="link-name"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="e.g., Design Mockups"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-url">URL</Label>
                  <Input
                    id="link-url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    type="url"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddLink}>
                  Add Link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file: TaskFile) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  if (file.isExternalLink && file.externalUrl) {
                    handleOpenLink(file.externalUrl);
                  } else if (file.url) {
                    handleOpenLink(file.url);
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.isExternalLink && file.externalUrl 
                        ? (() => {
                            try {
                              return new URL(file.externalUrl).hostname;
                            } catch {
                              return file.externalUrl;
                            }
                          })()
                        : `${(file.sizeKb || 0).toFixed(1)} KB`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        •••
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {file.isExternalLink ? (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLink(file.externalUrl || '');
                        }}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Link
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLink(file.url);
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No links attached to this task
          </p>
        )}
      </CardContent>
    </Card>
  );
}
