import { useState } from "react";
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
import { Upload, Download, FileText } from "lucide-react";
import { Client } from "@/types";

interface BulkImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportClientsDialog({ open, onOpenChange }: BulkImportClientsDialogProps) {
  const { addClient } = useAppContext();
  const { toast } = useToast();
  const [importData, setImportData] = useState("");
  const [previewClients, setPreviewClients] = useState<Partial<Client>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePreview = () => {
    try {
      let clients: Partial<Client>[] = [];
      
      if (importData.trim().startsWith('[') || importData.trim().startsWith('{')) {
        // JSON format
        const parsed = JSON.parse(importData);
        clients = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // CSV format
        const lines = importData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const client: Partial<Client> = {};
          
          headers.forEach((header, index) => {
            if (values[index]) {
              switch (header) {
                case 'name':
                  client.name = values[index];
                  break;
                case 'email':
                  client.email = values[index];
                  break;
                case 'phone':
                  client.phone = values[index];
                  break;
                case 'website':
                  client.website = values[index];
                  break;
                case 'address':
                  client.address = values[index];
                  break;
                case 'status':
                  client.status = values[index] as "active" | "inactive";
                  break;
              }
            }
          });
          
          if (client.name && client.email) {
            clients.push(client);
          }
        }
      }
      
      setPreviewClients(clients);
      toast({
        title: "Preview Generated",
        description: `Found ${clients.length} valid clients to import.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse import data. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (previewClients.length === 0) {
      toast({
        title: "Error",
        description: "No clients to import. Please preview first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let successCount = 0;
      
      for (const clientData of previewClients) {
        if (clientData.name && clientData.email) {
          const newClient: Omit<Client, 'id'> = {
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone || "",
            website: clientData.website || "",
            address: clientData.address || "",
            status: clientData.status || "active",
            createdAt: new Date().toISOString(),
          };
          
          addClient(newClient);
          successCount++;
        }
      }
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${successCount} clients.`,
      });
      
      setImportData("");
      setPreviewClients([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import clients. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csvTemplate = "name,email,phone,website,address,status\nJohn Doe,john@example.com,+1234567890,https://example.com,123 Main St,active";
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Clients</DialogTitle>
          <DialogDescription>
            Import multiple clients at once using CSV or JSON format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download CSV Template
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium">Import Data</label>
            <Textarea
              placeholder="Paste your CSV or JSON data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={previewClients.length === 0 || isProcessing}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? "Importing..." : `Import ${previewClients.length} Clients`}
            </Button>
          </div>

          {previewClients.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Preview ({previewClients.length} clients)</h3>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Phone</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewClients.slice(0, 10).map((client, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{client.name}</td>
                        <td className="p-2">{client.email}</td>
                        <td className="p-2">{client.phone || "-"}</td>
                        <td className="p-2">{client.status || "active"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewClients.length > 10 && (
                  <p className="text-muted-foreground text-center p-2">
                    ... and {previewClients.length - 10} more clients
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <div>
              <strong>CSV Format:</strong> name,email,phone,website,address,status
            </div>
            <div>
              <strong>JSON Format:</strong> Array of objects with properties: name, email, phone, website, address, status
            </div>
            <div>
              <strong>Required fields:</strong> name, email
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}