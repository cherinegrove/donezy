
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash, Copy, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecordActionsProps {
  recordId: string;
  recordType: string;
  recordName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onApprove?: () => void;
  onApproveBillable?: () => void;
  onApproveNonBillable?: () => void;
  onDecline?: () => void;
  disableEdit?: boolean;
  disableDelete?: boolean;
  disableDuplicate?: boolean;
  showApproveDecline?: boolean;
}

export function RecordActions({
  recordId,
  recordType,
  recordName,
  onEdit,
  onDelete,
  onDuplicate,
  onApprove,
  onApproveBillable,
  onApproveNonBillable,
  onDecline,
  disableEdit = false,
  disableDelete = false,
  disableDuplicate = true,
  showApproveDecline = false,
}: RecordActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      toast({
        title: `${recordType} Deleted`,
        description: `${recordType} ${recordName || recordId} has been deleted successfully.`,
      });
    }
    setShowDeleteDialog(false);
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate();
      toast({
        title: `${recordType} Duplicated`,
        description: `A copy of ${recordType} ${recordName || recordId} has been created.`,
      });
    }
  };

  const handleApprove = () => {
    if (onApprove) {
      onApprove();
      toast({
        title: `${recordType} Approved`,
        description: `${recordType} ${recordName || recordId} has been approved.`,
      });
    }
  };

  const handleApproveBillable = () => {
    if (onApproveBillable) {
      onApproveBillable();
      // Toast is handled in the parent component
    }
  };

  const handleApproveNonBillable = () => {
    if (onApproveNonBillable) {
      onApproveNonBillable();
      // Toast is handled in the parent component
    }
  };

  const handleDecline = () => {
    if (onDecline) {
      onDecline();
      // Toast is handled in the parent component
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showApproveDecline && (
            <>
              {onApproveBillable ? (
                <DropdownMenuItem onClick={handleApproveBillable} className="text-green-600 focus:text-green-600">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>Approve (Billable)</span>
                </DropdownMenuItem>
              ) : (
                onApprove && (
                  <DropdownMenuItem onClick={handleApprove} className="text-green-600 focus:text-green-600">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    <span>Approve</span>
                  </DropdownMenuItem>
                )
              )}
              
              {onApproveNonBillable && (
                <DropdownMenuItem onClick={handleApproveNonBillable} className="text-blue-600 focus:text-blue-600">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>Approve (Non-billable)</span>
                </DropdownMenuItem>
              )}
              
              {onDecline && (
                <DropdownMenuItem onClick={handleDecline} className="text-amber-600 focus:text-amber-600">
                  <XCircle className="mr-2 h-4 w-4" />
                  <span>Decline</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          
          {!disableEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </DropdownMenuItem>
          )}
          {!disableDuplicate && (
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Duplicate</span>
            </DropdownMenuItem>
          )}
          {!disableDelete && (
            <>
              {(!disableEdit || !disableDuplicate || showApproveDecline) && <DropdownMenuSeparator />}
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {recordType.toLowerCase()}
              {recordName ? ` "${recordName}"` : ''} and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90" 
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
