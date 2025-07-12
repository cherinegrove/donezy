import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, X } from "lucide-react";
import { CustomRole, AccessLevel } from "@/types";

interface BulkImportRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportRolesDialog({ open, onOpenChange }: BulkImportRolesDialogProps) {
  const { addCustomRole } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState("");
  const [previewRoles, setPreviewRoles] = useState<Partial<CustomRole>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  const handleFileRead = (content: string, fileName: string) => {
    setImportData(content);
    setUploadedFileName(fileName);
    toast({
      title: "File Uploaded",
      description: `${fileName} has been loaded successfully.`,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleFileRead(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV or JSON file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleFileRead(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const clearData = () => {
    setImportData("");
    setPreviewRoles([]);
    setUploadedFileName(null);
    setShowMapping(false);
    setColumnMapping({});
    setAvailableColumns([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePreview = () => {
    try {
      let columns: string[] = [];
      
      if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
        const parsed = JSON.parse(importData);
        const firstItem = Array.isArray(parsed) ? parsed[0] : parsed;
        columns = Object.keys(firstItem || {});
      } else {
        const lines = importData.trim().split('\n');
        columns = lines[0].split(',').map(h => h.trim());
      }
      
      setAvailableColumns(columns);
      setShowMapping(true);
      
      toast({
        title: "Ready for Mapping",
        description: `Found ${columns.length} columns. Please map them to the correct fields.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse import data. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const parsePermissions = (permissionString: string): Record<string, AccessLevel> => {
    const permissions: Record<string, AccessLevel> = {};
    
    // Default permissions structure
    const defaultFeatures = [
      'dashboard', 'projects', 'tasks', 'timeTracking', 'clients', 
      'teams', 'users', 'reports', 'messages', 'notes', 'settings'
    ];
    
    // Initialize with none
    defaultFeatures.forEach(feature => {
      permissions[feature] = 'none';
    });
    
    // Parse permission string like "projects:edit,tasks:view,clients:create"
    if (permissionString) {
      const permissionPairs = permissionString.split(',');
      permissionPairs.forEach(pair => {
        const [feature, level] = pair.split(':').map(s => s.trim());
        if (feature && level && defaultFeatures.includes(feature)) {
          permissions[feature] = level as AccessLevel;
        }
      });
    }
    
    return permissions;
  };

  const processImportWithMapping = () => {
    try {
      let roles: Partial<CustomRole>[] = [];
      
      if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
        const parsed = JSON.parse(importData);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        roles = items.map(item => {
          const role: Partial<CustomRole> = {};
          
          Object.entries(columnMapping).forEach(([column, field]) => {
            if (field && item[column] !== undefined) {
              switch (field) {
                case 'name':
                  role.name = item[column];
                  break;
                case 'description':
                  role.description = item[column];
                  break;
                case 'permissions':
                  role.permissions = parsePermissions(item[column]);
                  break;
              }
            }
          });
          
          return role;
        }).filter(role => role.name);
      } else {
        const lines = importData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const role: Partial<CustomRole> = {};
          
          headers.forEach((header, index) => {
            const field = columnMapping[header];
            if (field && values[index]) {
              switch (field) {
                case 'name':
                  role.name = values[index];
                  break;
                case 'description':
                  role.description = values[index];
                  break;
                case 'permissions':
                  role.permissions = parsePermissions(values[index]);
                  break;
              }
            }
          });
          
          if (role.name) {
            roles.push(role);
          }
        }
      }
      
      setPreviewRoles(roles);
      toast({
        title: "Preview Generated",
        description: `Found ${roles.length} valid roles to import.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process mapped data. Please check your mappings.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (previewRoles.length === 0) {
      toast({
        title: "Error",
        description: "No roles to import. Please preview first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let successCount = 0;
      
      for (const roleData of previewRoles) {
        if (roleData.name) {
          const newRole: Omit<CustomRole, 'id'> = {
            name: roleData.name,
            description: roleData.description || "",
            permissions: roleData.permissions || {},
          };
          
          addCustomRole(newRole);
          successCount++;
        }
      }
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${successCount} roles.`,
      });
      
      setImportData("");
      setPreviewRoles([]);
      setUploadedFileName(null);
      setShowMapping(false);
      setColumnMapping({});
      setAvailableColumns([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import roles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const availableFields = [
    { value: 'name', label: 'Name *' },
    { value: 'description', label: 'Description' },
    { value: 'permissions', label: 'Permissions (feature:level,...)' },
  ];

  const downloadTemplate = () => {
    const csvTemplate = "name,description,permissions\nProject Manager,Can manage projects and tasks,projects:edit,tasks:edit,clients:view\nTeam Lead,Can view reports and manage team,teams:edit,reports:view,tasks:view\nViewer,Read-only access,projects:view,tasks:view,clients:view";
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roles_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Roles</DialogTitle>
          <DialogDescription>
            Import multiple custom roles at once using CSV or JSON format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download CSV Template
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </Button>
            {(importData || uploadedFileName) && (
              <Button variant="outline" onClick={clearData} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your CSV or JSON file here, or{" "}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline"
              >
                browse files
              </button>
            </p>
            {uploadedFileName && (
              <p className="text-sm font-medium text-primary">
                Uploaded: {uploadedFileName}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Or paste your data directly</label>
            <Textarea
              placeholder="Paste your CSV or JSON data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline" disabled={!importData.trim()}>
              <FileText className="h-4 w-4 mr-2" />
              Parse & Map Fields
            </Button>
            {showMapping && (
              <Button 
                onClick={processImportWithMapping} 
                variant="outline"
                disabled={!Object.values(columnMapping).some(v => v === 'name')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
            )}
            <Button 
              onClick={handleImport} 
              disabled={previewRoles.length === 0 || isProcessing}
              className={previewRoles.length > 0 ? "bg-primary" : ""}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? "Importing..." : `Import ${previewRoles.length} Roles`}
            </Button>
          </div>

          {showMapping && previewRoles.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Next step:</strong> Map at least one column to "Name" and click "Generate Preview" to enable import.
              </p>
            </div>
          )}

          {showMapping && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Map Your Columns to Fields</h3>
              <div className="space-y-3">
                {availableColumns.map((column) => (
                  <div key={column} className="flex items-center gap-4">
                    <div className="w-1/3">
                      <label className="text-sm font-medium">{column}</label>
                    </div>
                    <div className="w-2/3">
                      <select
                        value={columnMapping[column] || ''}
                        onChange={(e) => setColumnMapping(prev => ({
                          ...prev,
                          [column]: e.target.value
                        }))}
                        className="w-full p-2 border rounded-md bg-background"
                      >
                        <option value="">Skip this column</option>
                        {availableFields.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <strong>* Required field:</strong> At least one column must be mapped to "Name"
                <br />
                <strong>Permissions format:</strong> feature:level,feature:level (e.g., projects:edit,tasks:view)
                <br />
                <strong>Available features:</strong> dashboard, projects, tasks, timeTracking, clients, teams, users, reports, messages, notes, settings
                <br />
                <strong>Permission levels:</strong> none, view, create, edit, delete
              </div>
            </div>
          )}

          {previewRoles.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Preview ({previewRoles.length} roles)</h3>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Permissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRoles.slice(0, 10).map((role, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{role.name}</td>
                        <td className="p-2">{role.description || "-"}</td>
                        <td className="p-2">
                          {Object.entries(role.permissions || {})
                            .filter(([, level]) => level !== 'none')
                            .length} permissions set
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRoles.length > 10 && (
                  <p className="text-muted-foreground text-center p-2">
                    ... and {previewRoles.length - 10} more roles
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <div>
              <strong>How to use:</strong>
            </div>
            <div>
              1. Upload or paste your data (CSV or JSON format)
            </div>
            <div>
              2. Map your columns to the correct fields
            </div>
            <div>
              3. Generate preview to verify the mapping
            </div>
            <div>
              4. Import your roles
            </div>
            <div>
              <strong>Note:</strong> Only "Name" field is required. Permissions should follow the format: feature:level,feature:level
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}