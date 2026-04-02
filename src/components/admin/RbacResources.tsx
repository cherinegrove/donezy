import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { resourceService } from "@/services/rbac";
import type { RbacResource_DB } from "@/types/rbac";

export default function RbacResources() {
  const [resources, setResources] = useState<RbacResource_DB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await resourceService.getAll();
        setResources(data);
      } catch (err) {
        console.error("Failed to load resources", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Resources</h2>
          <p className="text-muted-foreground mt-1">
            System resources available for role-based access control.
          </p>
        </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Loading resources...
                    </TableCell>
                  </TableRow>
                ) : resources.length > 0 ? (
                  resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="font-mono text-sm">
                        <Badge variant="outline">{resource.name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{resource.display_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {resource.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
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
    </div>
  );
}
