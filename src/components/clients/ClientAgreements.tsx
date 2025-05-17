
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Calendar, DollarSign, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AddAgreementDialog } from "@/components/clients/AddAgreementDialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ClientAgreementsProps {
  clientId: string;
}

export function ClientAgreements({ clientId }: ClientAgreementsProps) {
  const { getClientAgreements, deleteClientAgreement, uploadClientFile, getClientFiles, deleteClientFile, currentUser } = useAppContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [agreementToDelete, setAgreementToDelete] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  const agreements = getClientAgreements(clientId);
  const clientFiles = getClientFiles ? getClientFiles(clientId) : [];
  
  // Convert files to options for MultiSelect
  const fileOptions = clientFiles.map(file => ({
    value: file.id,
    label: file.name
  }));
  
  const isAdmin = currentUser?.role === 'admin';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      setFiles(Array.from(fileList));
    }
  };
  
  const handleFileUpload = async () => {
    if (files.length === 0) return;
    
    try {
      for (const file of files) {
        if (uploadClientFile) {
          await uploadClientFile(clientId, file);
        }
      }
      // Reset form
      setFiles([]);
    } catch (error) {
      console.error("Error uploading files:", error);
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Client Agreements
        </CardTitle>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Agreement
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="text-sm font-medium">Upload Files</h3>
            <div className="flex flex-col gap-2">
              <Input 
                type="file" 
                multiple 
                onChange={handleFileChange}
              />
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleFileUpload}
                disabled={files.length === 0}
              >
                Upload Files
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Available Files</Label>
              <MultiSelect
                options={fileOptions}
                selectedValues={selectedFiles}
                onValueChange={setSelectedFiles}
                placeholder="Select files to attach"
              />
            </div>
          </div>

          {/* Agreements List */}
          {agreements.length > 0 ? (
            <div className="space-y-4">
              {agreements.map((agreement) => (
                <div
                  key={agreement.id}
                  className="flex flex-col sm:flex-row justify-between gap-4 p-4 border rounded-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={agreement.status === 'active' ? 'default' : 'outline'}>
                        {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
                      </Badge>
                      <span className="font-medium">{agreement.serviceType}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(agreement.startDate), 'PP')}
                          {agreement.endDate ? ` - ${format(new Date(agreement.endDate), 'PP')}` : ' (Ongoing)'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {agreement.currency} {agreement.rate.toLocaleString()}
                          {agreement.serviceType !== 'payasyougo' ? '/hour' : ''}
                        </span>
                      </div>
                      
                      {agreement.allocatedHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {agreement.allocatedHours} hours allocated
                            {agreement.usedHours !== undefined && ` (${agreement.usedHours} used)`}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {agreement.description}
                    </p>
                  </div>
                  
                  {isAdmin && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setAgreementToDelete(agreement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed rounded-md">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No agreements found</p>
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                Add Agreement
              </Button>
            </div>
          )}
        </div>
        
        <AddAgreementDialog
          clientId={clientId}
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          selectedFiles={selectedFiles}
        />
        
        <AlertDialog open={!!agreementToDelete} onOpenChange={() => setAgreementToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this agreement.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (agreementToDelete) {
                    deleteClientAgreement(agreementToDelete);
                  }
                  setAgreementToDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
