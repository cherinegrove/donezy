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
import { Team } from "@/types";

interface BulkImportTeamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportTeamsDialog({ open, onOpenChange }: BulkImportTeamsDialogProps) {
  const { addTeam, users } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState("");
  const [previewTeams, setPreviewTeams] = useState<Partial<Team>[]>([]);
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
    setPreviewTeams([]);
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

  const processImportWithMapping = () => {
    try {
      let teams: Partial<Team>[] = [];
      
      if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
        const parsed = JSON.parse(importData);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        teams = items.map(item => {
          const team: Partial<Team> = {};
          
          Object.entries(columnMapping).forEach(([column, field]) => {
            if (field && item[column] !== undefined) {
              switch (field) {
                case 'name':
                  team.name = item[column];
                  break;
                case 'description':
                  team.description = item[column];
                  break;
                case 'memberIds':
                  // Handle comma-separated member emails
                  const memberEmails = item[column].split(',').map((email: string) => email.trim());
                  const memberIds = memberEmails.map((email: string) => {
                    const user = users.find(u => u.email === email);
                    return user?.id;
                  }).filter(Boolean);
                  team.memberIds = memberIds;
                  break;
                case 'leaderId':
                  const leader = users.find(u => u.email === item[column]);
                  team.leaderId = leader?.id;
                  break;
              }
            }
          });
          
          return team;
        }).filter(team => team.name);
      } else {
        const lines = importData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const team: Partial<Team> = {};
          
          headers.forEach((header, index) => {
            const field = columnMapping[header];
            if (field && values[index]) {
              switch (field) {
                case 'name':
                  team.name = values[index];
                  break;
                case 'description':
                  team.description = values[index];
                  break;
                case 'memberIds':
                  const memberEmails = values[index].split(';').map(email => email.trim());
                  const memberIds = memberEmails.map(email => {
                    const user = users.find(u => u.email === email);
                    return user?.id;
                  }).filter(Boolean);
                  team.memberIds = memberIds;
                  break;
                case 'leaderId':
                  const leader = users.find(u => u.email === values[index]);
                  team.leaderId = leader?.id;
                  break;
              }
            }
          });
          
          if (team.name) {
            teams.push(team);
          }
        }
      }
      
      setPreviewTeams(teams);
      toast({
        title: "Preview Generated",
        description: `Found ${teams.length} valid teams to import.`,
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
    if (previewTeams.length === 0) {
      toast({
        title: "Error",
        description: "No teams to import. Please preview first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let successCount = 0;
      
      for (const teamData of previewTeams) {
        if (teamData.name) {
          const newTeam: Omit<Team, 'id'> = {
            name: teamData.name,
            description: teamData.description || "",
            memberIds: teamData.memberIds || [],
            leaderId: teamData.leaderId,
          };
          
          addTeam(newTeam);
          successCount++;
        }
      }
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${successCount} teams.`,
      });
      
      setImportData("");
      setPreviewTeams([]);
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
        description: "Failed to import teams. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const availableFields = [
    { value: 'name', label: 'Name *' },
    { value: 'description', label: 'Description' },
    { value: 'memberIds', label: 'Members (emails separated by ;)' },
    { value: 'leaderId', label: 'Leader (email)' },
  ];

  const downloadTemplate = () => {
    const csvTemplate = "name,description,members,leader\nDevelopment Team,Frontend and backend developers,john@example.com;jane@example.com,john@example.com\nDesign Team,UI/UX designers,alice@example.com;bob@example.com,alice@example.com";
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teams_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Teams</DialogTitle>
          <DialogDescription>
            Import multiple teams at once using CSV or JSON format.
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
              disabled={previewTeams.length === 0 || isProcessing}
              className={previewTeams.length > 0 ? "bg-primary" : ""}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? "Importing..." : `Import ${previewTeams.length} Teams`}
            </Button>
          </div>

          {showMapping && previewTeams.length === 0 && (
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
                <strong>Note:</strong> For members, separate email addresses with semicolons (;)
              </div>
            </div>
          )}

          {previewTeams.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Preview ({previewTeams.length} teams)</h3>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Members</th>
                      <th className="text-left p-2">Leader</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTeams.slice(0, 10).map((team, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{team.name}</td>
                        <td className="p-2">{team.description || "-"}</td>
                        <td className="p-2">{team.memberIds?.length || 0} members</td>
                        <td className="p-2">{users.find(u => u.id === team.leaderId)?.name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewTeams.length > 10 && (
                  <p className="text-muted-foreground text-center p-2">
                    ... and {previewTeams.length - 10} more teams
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
              4. Import your teams
            </div>
            <div>
              <strong>Note:</strong> Only "Name" field is required. For members and leader, use existing user email addresses.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}