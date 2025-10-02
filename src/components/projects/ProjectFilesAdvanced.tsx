import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  File, 
  Download, 
  Trash2, 
  FileText, 
  Image, 
  FileArchive,
  Calendar,
  Folder,
  FolderPlus,
  Link as LinkIcon,
  ExternalLink,
  MoreHorizontal,
  Edit,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ProjectFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
}

interface ProjectFile {
  id: string;
  name: string;
  file_path?: string;
  file_size?: number;
  mime_type: string;
  uploaded_at: string;
  folder_id?: string;
  is_external_link: boolean;
  external_url?: string;
  external_provider?: string;
}

interface ProjectFilesAdvancedProps {
  projectId: string;
}

const EXTERNAL_PROVIDERS = [
  { value: 'google_drive', label: 'Google Drive', icon: '📂' },
  { value: 'dropbox', label: 'Dropbox', icon: '📁' },
  { value: 'onedrive', label: 'OneDrive', icon: '☁️' },
  { value: 'sharepoint', label: 'SharePoint', icon: '🏢' },
  { value: 'other', label: 'Other', icon: '🔗' }
];

export function ProjectFilesAdvanced({ projectId }: ProjectFilesAdvancedProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [linkData, setLinkData] = useState({
    name: '',
    url: '',
    provider: 'other'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFolders();
    loadFiles();
  }, [projectId, currentFolderId]);

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('project_folders')
        .select('*')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId);

      if (currentFolderId) {
        query = query.eq('folder_id', currentFolderId);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query.order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { error } = await supabase
        .from('project_folders')
        .insert({
          project_id: projectId,
          name: newFolderName,
          parent_folder_id: currentFolderId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder created successfully"
      });

      setNewFolderName('');
      setShowCreateFolder(false);
      loadFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive"
      });
    }
  };

  const addExternalLink = async () => {
    if (!linkData.name.trim() || !linkData.url.trim()) {
      toast({
        title: "Error",
        description: "Please enter both name and URL",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Attempting to add external link:', {
        projectId,
        linkData,
        currentFolderId
      });

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', sessionData?.session?.user?.id);
      
      if (!sessionData?.session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add files",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          name: linkData.name,
          folder_id: currentFolderId,
          is_external_link: true,
          external_url: linkData.url,
          external_provider: linkData.provider,
          mime_type: 'application/link',
          file_path: null,
          file_size: null
        })
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Link added successfully:', data);

      toast({
        title: "Success",
        description: "External link added successfully"
      });

      setLinkData({ name: '', url: '', provider: 'other' });
      setShowAddLink(false);
      loadFiles();
    } catch (error: any) {
      console.error('Error adding external link:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add external link",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setUploading(true);
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
      setUploading(false);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${currentFolderId || 'root'}/${Date.now()}-${file.name}`;
      
      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          folder_id: currentFolderId,
          is_external_link: false
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: `${file.name} uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${file.name}`,
        variant: "destructive"
      });
    }
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const deleteFile = async (file: ProjectFile) => {
    try {
      setLoading(true);
      
      // Delete from storage if it's a physical file
      if (!file.is_external_link && file.file_path) {
        const { error: storageError } = await supabase.storage
          .from('project-files')
          .remove([file.file_path]);

        if (storageError) console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully"
      });

      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.is_external_link) return ExternalLink;
    if (file.mime_type?.startsWith('image/')) return Image;
    if (file.mime_type?.includes('text') || file.mime_type?.includes('document')) return FileText;
    if (file.mime_type?.includes('zip') || file.mime_type?.includes('archive')) return FileArchive;
    return File;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCurrentFolder = () => {
    return folders.find(f => f.id === currentFolderId);
  };

  const getCurrentFolderChildren = () => {
    return folders.filter(f => f.parent_folder_id === currentFolderId);
  };

  const getBreadcrumb = () => {
    const breadcrumb: ProjectFolder[] = [];
    let current = getCurrentFolder();
    
    while (current) {
      breadcrumb.unshift(current);
      current = folders.find(f => f.id === current?.parent_folder_id);
    }
    
    return breadcrumb;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Project Files
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderPlus className="h-4 w-4 mr-1" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="folderName">Folder Name</Label>
                    <Input
                      id="folderName"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                      Create Folder
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddLink} onOpenChange={setShowAddLink}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <LinkIcon className="h-4 w-4 mr-1" />
                  Add Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add External Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="linkName">Display Name</Label>
                    <Input
                      id="linkName"
                      value={linkData.name}
                      onChange={(e) => setLinkData({ ...linkData, name: e.target.value })}
                      placeholder="Enter display name..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkUrl">URL</Label>
                    <Input
                      id="linkUrl"
                      value={linkData.url}
                      onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider">Provider</Label>
                    <Select 
                      value={linkData.provider} 
                      onValueChange={(value) => setLinkData({ ...linkData, provider: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXTERNAL_PROVIDERS.map(provider => (
                          <SelectItem key={provider.value} value={provider.value}>
                            <div className="flex items-center gap-2">
                              <span>{provider.icon}</span>
                              {provider.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addExternalLink} disabled={!linkData.name.trim() || !linkData.url.trim()}>
                      Add Link
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddLink(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolderId(null)}
            className="p-1 h-auto"
          >
            <Folder className="h-4 w-4" />
          </Button>
          {getBreadcrumb().map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolderId(folder.id)}
                className="p-1 h-auto text-xs"
              >
                {folder.name}
              </Button>
            </div>
          ))}
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
            {/* Back Navigation */}
            {currentFolderId && (
              <div
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  const current = getCurrentFolder();
                  setCurrentFolderId(current?.parent_folder_id || null);
                }}
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Back to parent folder</span>
              </div>
            )}

            {/* Folders */}
            {getCurrentFolderChildren().map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <div className="flex items-center gap-3">
                  <Folder className="h-8 w-8 text-blue-500" />
                  <div>
                    <h4 className="font-medium text-sm">{folder.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(folder.created_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}

            {/* Files */}
            {files.map((file) => {
              const FileIcon = getFileIcon(file);
              const provider = EXTERNAL_PROVIDERS.find(p => p.value === file.external_provider);
              
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                      {file.is_external_link && provider && (
                        <span className="absolute -top-1 -right-1 text-xs">
                          {provider.icon}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{file.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {!file.is_external_link && (
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(file.file_size)}
                          </Badge>
                        )}
                        {file.is_external_link && (
                          <Badge variant="outline" className="text-xs">
                            {provider?.label || 'External Link'}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(file.uploaded_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {file.is_external_link ? (
                        <DropdownMenuItem onClick={() => openExternalLink(file.external_url!)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Link
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => deleteFile(file)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            
            {files.length === 0 && getCurrentFolderChildren().length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-8">
                <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No files or folders in this location</p>
                <p className="text-sm">Upload files, create folders, or add external links to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}