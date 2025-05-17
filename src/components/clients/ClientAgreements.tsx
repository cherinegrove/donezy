import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { AddAgreementDialog } from "./AddAgreementDialog";
import { Plus, FileText, Trash2, Edit, Upload } from "lucide-react";
import { ClientAgreement } from "@/types";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction  
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ClientAgreementsProps {
  clientId: string;
}

export function ClientAgreements({ clientId }: ClientAgreementsProps) {
  const { getClientAgreements, getClientById, deleteClientAgreement, updateClientAgreement, uploadClientFile, getClientFiles } = useAppContext();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFileUploadDialogOpen, setIsFileUploadDialogOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<ClientAgreement | null>(null);
  const [editAgreementData, setEditAgreementData] = useState<Partial<ClientAgreement>>({});
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  
  const client = getClientById(clientId);
  const agreements = getClientAgreements(clientId);
  const clientFiles = getClientFiles(clientId);

  // Handle edit dialog open
  const handleEditAgreement = (agreement: ClientAgreement) => {
    setSelectedAgreement(agreement);
    setEditAgreementData(agreement);
    setIsEditDialogOpen(true);
  };

  // Handle delete dialog open
  const handleDeleteAgreement = (agreement: ClientAgreement) => {
    setSelectedAgreement(agreement);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle file upload dialog open
  const handleFileUpload = (agreement: ClientAgreement) => {
    setSelectedAgreement(agreement);
    setIsFileUploadDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedAgreement) {
      deleteClientAgreement(selectedAgreement.id);
      setIsDeleteDialogOpen(false);
      setSelectedAgreement(null);
      toast({
        title: "Agreement deleted",
        description: "The agreement has been successfully deleted",
      });
    }
  };

  // Handle edit save
  const handleEditSave = () => {
    if (selectedAgreement && editAgreementData) {
      updateClientAgreement(selectedAgreement.id, editAgreementData);
      setIsEditDialogOpen(false);
      setSelectedAgreement(null);
      setEditAgreementData({});
      toast({
        title: "Agreement updated",
        description: "The agreement has been successfully updated",
      });
    }
  };
  
  // Handle file upload form change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };
  
  // Handle file upload submission
  const handleFileUploadSubmit = async () => {
    if (!fileToUpload || !selectedAgreement || !clientId) return;
    
    try {
      await uploadClientFile(clientId, fileToUpload);
      setIsFileUploadDialogOpen(false);
      setFileToUpload(null);
      
      toast({
        title: "File uploaded",
        description: "File has been successfully attached to the agreement",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading the file",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Client Agreements</CardTitle>
          <CardDescription>Manage agreements, retainers, and contracts</CardDescription>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Agreement
        </Button>
      </CardHeader>
      <CardContent>
        {agreements.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map(agreement => (
                <TableRow key={agreement.id}>
                  <TableCell>
                    <div className="font-medium">{agreement.serviceType}</div>
                    <div className="text-sm text-muted-foreground">
                      {agreement.description.substring(0, 40)}
                      {agreement.description.length > 40 ? "..." : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(agreement.startDate), "MMM d, yyyy")}
                    {agreement.endDate && (
                      <> to {format(new Date(agreement.endDate), "MMM d, yyyy")}</>
                    )}
                  </TableCell>
                  <TableCell>
                    {agreement.allocatedHours ? (
                      <div>
                        <div>{agreement.usedHours || 0} / {agreement.allocatedHours}</div>
                        <div className="h-2 w-full bg-muted rounded-full mt-1">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ 
                              width: `${Math.min(100, ((agreement.usedHours || 0) / agreement.allocatedHours) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    {agreement.rate} {agreement.currency}/hr
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        agreement.status === "active" ? "default" : 
                        agreement.status === "completed" ? "outline" : "secondary"
                      }
                    >
                      {agreement.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleFileUpload(agreement)}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditAgreement(agreement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteAgreement(agreement)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium">No agreements</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an agreement to start tracking this client's contract terms.
            </p>
          </div>
        )}
        
        {clientFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Client Files</h3>
            <div className="border rounded-md divide-y">
              {clientFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="text-xs text-muted-foreground">
                      {(file.sizeKb / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Add Agreement Dialog */}
      <AddAgreementDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        clientId={clientId} 
      />
      
      {/* Edit Agreement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agreement</DialogTitle>
            <DialogDescription>
              Update the agreement details for {client?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type</Label>
                <select 
                  id="serviceType" 
                  className="w-full p-2 border rounded-md" 
                  value={editAgreementData.serviceType || 'retainer'}
                  onChange={(e) => setEditAgreementData({
                    ...editAgreementData, 
                    serviceType: e.target.value as any
                  })}
                >
                  <option value="retainer">Retainer</option>
                  <option value="payasyougo">Pay as You Go</option>
                  <option value="bank-hours">Bank Hours</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select 
                  id="status" 
                  className="w-full p-2 border rounded-md" 
                  value={editAgreementData.status || 'active'}
                  onChange={(e) => setEditAgreementData({
                    ...editAgreementData, 
                    status: e.target.value as any
                  })}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input 
                  id="startDate" 
                  type="date" 
                  value={editAgreementData.startDate || ''}
                  onChange={(e) => setEditAgreementData({
                    ...editAgreementData, 
                    startDate: e.target.value
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input 
                  id="endDate" 
                  type="date" 
                  value={editAgreementData.endDate || ''}
                  onChange={(e) => setEditAgreementData({
                    ...editAgreementData, 
                    endDate: e.target.value
                  })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Rate</Label>
                <Input 
                  id="rate" 
                  type="number" 
                  value={editAgreementData.rate || 0}
                  onChange={(e) => setEditAgreementData({
                    ...editAgreementData, 
                    rate: Number(e.target.value)
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input 
                  id="currency" 
                  type="text" 
                  value={editAgreementData.currency || 'USD'}
                  onChange={(e) => setEditAgreementData({
                    ...editAgreementData, 
                    currency: e.target.value
                  })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="allocatedHours">Allocated Hours</Label>
                <Input 
                  id="allocatedHours" 
                  type="number" 
                  value={editAgreementData.allocatedHours || 0}
                  onChange={(e) => setEditAgreementData({
                    ...editAgreementData, 
                    allocatedHours: Number(e.target.value)
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="usedHours">Used Hours</Label>
                <Input 
                  id="usedHours" 
                  type="number" 
                  value={editAgreementData.usedHours || 0}
                  onChange={(e) => setEditAgreementData({
                    ...editAgreementData, 
                    usedHours: Number(e.target.value)
                  })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                rows={3} 
                value={editAgreementData.description || ''}
                onChange={(e) => setEditAgreementData({
                  ...editAgreementData, 
                  description: e.target.value
                })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* File Upload Dialog */}
      <Dialog open={isFileUploadDialogOpen} onOpenChange={setIsFileUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Agreement File</DialogTitle>
            <DialogDescription>
              Attach files to this agreement for documentation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <span className="mt-2 block text-sm font-medium">
                  Click to upload or drag and drop
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  PDF, DOC, DOCX, XLS, XLSX up to 10MB
                </span>
                <Input 
                  id="file-upload" 
                  type="file" 
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </Label>
            </div>
            
            {fileToUpload && (
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="text-sm truncate max-w-[250px]">{fileToUpload.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFileUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleFileUploadSubmit}
              disabled={!fileToUpload}
            >
              Upload File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Agreement Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this client agreement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
