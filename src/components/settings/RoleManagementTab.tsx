
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AccessLevel, CustomRole } from "@/types";
import { useForm } from "react-hook-form";
import { Shield, Pencil, X, Info } from "lucide-react";

type FormValues = {
  name: string;
  description: string;
  permissions: Record<string, AccessLevel>;
}

// Default form values for a new role
const defaultFormValues: FormValues = {
  name: "",
  description: "",
  permissions: {
    accountSettings: "none",
    reports: "none",
    timeTracking: "none",
    clients: "none",
    projects: "none",
    tasks: "none",
    users: "none"
  }
};

export function RoleManagementTab() {
  const { customRoles, addCustomRole, updateCustomRole, deleteCustomRole } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: defaultFormValues
  });

  const handleEditRole = (role: CustomRole) => {
    form.reset({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions
    });
    setEditingRoleId(role.id);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    form.reset(defaultFormValues);
    setEditingRoleId(null);
    setIsEditing(false);
  };

  const handleCreateNewRole = () => {
    form.reset(defaultFormValues);
    setEditingRoleId(null);
    setIsEditing(true);
  };

  const onSubmit = (data: FormValues) => {
    const roleData: Omit<CustomRole, "id"> = {
      name: data.name,
      description: data.description,
      permissions: data.permissions
    };

    if (editingRoleId) {
      updateCustomRole(editingRoleId, roleData);
    } else {
      addCustomRole(roleData);
    }
    
    form.reset(defaultFormValues);
    setEditingRoleId(null);
    setIsEditing(false);
  };

  const handleDeleteRole = (id: string) => {
    deleteCustomRole(id);
  };

  const permissionOptions: AccessLevel[] = ["none", "view", "create", "edit", "delete"];
  const permissionKeys = Object.keys(defaultFormValues.permissions);
  
  // Function to handle permission change
  const handlePermissionChange = (permission: string, level: AccessLevel) => {
    const currentPermissions = form.getValues("permissions");
    form.setValue("permissions", {
      ...currentPermissions,
      [permission]: level
    });
  };

  const getPermissionDescription = (level: AccessLevel): string => {
    switch (level) {
      case 'none': return 'No access';
      case 'view': return 'View only';
      case 'create': return 'View + Create';
      case 'edit': return 'View + Create + Edit';
      case 'delete': return 'Full access';
      default: return 'Unknown';
    }
  };

  // Define built-in role permissions
  const builtInRoles = [
    {
      name: "Admin",
      description: "Full system access with all permissions",
      permissions: {
        accountSettings: "delete" as AccessLevel,
        reports: "delete" as AccessLevel,
        timeTracking: "delete" as AccessLevel,
        clients: "delete" as AccessLevel,
        projects: "delete" as AccessLevel,
        tasks: "delete" as AccessLevel,
        users: "delete" as AccessLevel
      }
    },
    {
      name: "User",
      description: "Standard user with limited access",
      permissions: {
        accountSettings: "none" as AccessLevel,
        reports: "view" as AccessLevel,
        timeTracking: "edit" as AccessLevel,
        clients: "view" as AccessLevel,
        projects: "view" as AccessLevel,
        tasks: "edit" as AccessLevel,
        users: "none" as AccessLevel
      }
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage custom roles with hierarchical permissions
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleCreateNewRole}>
            Create New Role
          </Button>
        )}
      </div>

      {/* Permission Hierarchy Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Permission Hierarchy:</strong> Higher levels include all lower permissions. Delete → Edit → Create → View → None
        </AlertDescription>
      </Alert>

      {/* Built-in Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Built-in Roles</CardTitle>
          <CardDescription>
            Default system roles with predefined permissions (cannot be modified)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {builtInRoles.map((role) => (
              <Card key={role.name} className="border-muted">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(role.permissions).map(([key, value]) => (
                        <tr key={key}>
                          <td className="py-1 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                          <td className="py-1 text-right">
                            <span className={
                              value === "none" 
                                ? "text-muted-foreground" 
                                : value === "view"
                                  ? "text-blue-500"
                                  : value === "create"
                                    ? "text-yellow-500"
                                    : value === "edit"
                                      ? "text-green-500"
                                      : "text-red-500"
                            }>
                              {getPermissionDescription(value as AccessLevel)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>{editingRoleId ? "Edit Role" : "Create New Role"}</CardTitle>
            <CardDescription>
              {editingRoleId 
                ? "Update role details and permissions" 
                : "Define a new role with hierarchical permissions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Role Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Project Manager"
                      {...form.register("name", { required: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Brief role description"
                      {...form.register("description")}
                    />
                  </div>
                </div>

                <Separator className="my-4" />
                
                <div>
                  <h3 className="font-medium mb-4">Permission Settings</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>No Access</TableHead>
                        <TableHead>View Only</TableHead>
                        <TableHead>Create</TableHead>
                        <TableHead>Edit</TableHead>
                        <TableHead>Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissionKeys.map((permission) => {
                        const currentValue = form.watch(`permissions.${permission}` as any);
                        
                        return (
                          <TableRow key={permission}>
                            <TableCell className="font-medium capitalize">
                              {permission.replace(/([A-Z])/g, ' $1').trim()}
                            </TableCell>
                            {permissionOptions.map((level) => (
                              <TableCell key={`${permission}-${level}`}>
                                <div className="flex flex-col items-center justify-center">
                                  <input
                                    type="radio"
                                    id={`${permission}-${level}`}
                                    name={`permissions.${permission}`}
                                    className="h-5 w-5 cursor-pointer"
                                    checked={currentValue === level}
                                    onChange={() => handlePermissionChange(permission, level)}
                                  />
                                  <span className="text-xs text-muted-foreground mt-1 text-center">
                                    {getPermissionDescription(level)}
                                  </span>
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRoleId ? "Update Role" : "Create Role"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {customRoles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customRoles.map((role) => (
            <Card key={role.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
                {role.description && (
                  <CardDescription>{role.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(role.permissions).map(([key, value]) => (
                      <tr key={key}>
                        <td className="py-1 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                        <td className="py-1 text-right">
                          <span className={
                            value === "none" 
                              ? "text-muted-foreground" 
                              : value === "view"
                                ? "text-blue-500"
                                : value === "create"
                                  ? "text-yellow-500"
                                  : value === "edit"
                                    ? "text-green-500"
                                    : "text-red-500"
                          }>
                            {getPermissionDescription(value as AccessLevel)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !isEditing && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No custom roles defined</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Create custom roles to manage hierarchical access permissions for different team members
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
