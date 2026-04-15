import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import { resourceService } from "@/services/rbac";
import type { RbacResource_DB } from "@/types/rbac";
import { RbacResourcesDialog } from "./RbacResourcesDialog";
import { useToast } from "@/hooks/use-toast";

export default function RbacResources() {
  const { toast } = useToast();
  const [resources, setResources] = useState<RbacResource_DB[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<RbacResource_DB | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RbacResource_DB | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const data = await resourceService.getAll();
      setResources(data);
    } catch (err) {
      console.error("Failed to load resources", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleCreateClick = () => {
    setEditingResource(null);
    setDialogOpen(true);
  };

  const handleEditClick = (resource: RbacResource_DB) => {
    setEditingResource(resource);
    setDialogOpen(true);
  };

  const handleDeleteClick = (resource: RbacResource_DB) => {
    setDeleteTarget(resource);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await resourceService.delete(deleteTarget.id);
      toast({
        title: "Resource deleted",
        description: `"${deleteTarget.display_name}" has been removed.`,
      });
      await loadResources();
    } catch (err) {
      console.error("Failed to delete resource", err);
      toast({
        title: "Delete failed",
        description: "This resource may have associated permissions.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleDialogSuccess = async () => {
    setDialogOpen(false);
    await loadResources();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Resources</h2>
          <p className="text-muted-foreground mt-1">
            System resources available for role-based access control.
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            These are the entities that can be protected with permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading resources...
                    </TableCell>
                  </TableRow>
                ) : resources.length > 0 ? (
                  resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="font-mono text-sm">
                        <Badge variant="outline">{resource.name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {resource.display_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {resource.description || (
                          <span className="italic opacity-50">No description</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(resource)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(resource)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <Shield className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      No resources found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RbacResourcesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={editingResource}
        onSuccess={handleDialogSuccess}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.display_name}
              </span>
              ? This will also remove all permissions associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
