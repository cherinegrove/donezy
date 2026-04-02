import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Key } from "lucide-react";
import { permissionService } from "@/services/rbac";
import type { RbacPermission } from "@/types/rbac";

export default function RbacPermissions() {
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, RbacPermission[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await permissionService.getGroupedByResource();
        setGroupedPermissions(data);
      } catch (err) {
        console.error("Failed to load permissions", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getScopeBadgeColor = (scope: string) => {
    switch (scope) {
      case "all": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "project": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "own": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Permissions</h2>
          <p className="text-muted-foreground mt-1">
            Granular permissions that define what actions can be performed on resources.
          </p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading permissions...
          </CardContent>
        </Card>
      ) : Object.keys(groupedPermissions).length > 0 ? (
        <div className="grid gap-6">
          {Object.entries(groupedPermissions).map(([resource, permissions]) => (
            <Card key={resource} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Resource: <span className="font-mono text-sm px-2 py-1 bg-background border rounded-md">{resource}</span>
                </CardTitle>
                <CardDescription>
                  {permissions.length} permission(s) defined for this resource
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Permission Name</TableHead>
                      <TableHead className="w-[20%]">Action</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {perm.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{perm.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {perm.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground mb-1">No Permissions Found</h3>
            <p>The system currently has no permissions defined.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
