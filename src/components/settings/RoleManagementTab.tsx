
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { AccessLevel, CustomRole } from "@/types";
import { useForm } from "react-hook-form";
import { Shield, Pencil, X } from "lucide-react";

type FormValues = {
  name: string;
  description: string;
  permissions: {
    accountSettings: AccessLevel;
    reports: AccessLevel;
    timeTracking: AccessLevel;
    clients: AccessLevel;
    projects: AccessLevel;
    tasks: AccessLevel;
    users: AccessLevel;
  };
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
    // Reset the form with default values when creating a new role
    form.reset(defaultFormValues);
    setEditingRoleId(null);
    setIsEditing(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingRoleId) {
      updateCustomRole(editingRoleId, data);
    } else {
      addCustomRole(data);
    }
    
    form.reset(defaultFormValues);
    setEditingRoleId(null);
    setIsEditing(false);
  };

  const handleDeleteRole = (id: string) => {
    deleteCustomRole(id);
  };

  const permissionOptions = ["none", "view", "edit"] as const;
  
  // Function to handle permission change
  const handlePermissionChange = (permission: keyof FormValues["permissions"], level: AccessLevel) => {
    form.setValue(`permissions.${permission}`, level);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage custom roles with specific permissions
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleCreateNewRole}>
            Create New Role
          </Button>
        )}
      </div>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>{editingRoleId ? "Edit Role" : "Create New Role"}</CardTitle>
            <CardDescription>
              {editingRoleId 
                ? "Update role details and permissions" 
                : "Define a new role with specific permissions"}
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
                        <TableHead>Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys(form.getValues().permissions).map((permission) => (
                        <TableRow key={permission}>
                          <TableCell className="font-medium capitalize">
                            {permission.replace(/([A-Z])/g, ' $1').trim()}
                          </TableCell>
                          {permissionOptions.map((level) => (
                            <TableCell key={`${permission}-${level}`}>
                              <div className="flex items-center justify-center">
                                <input
                                  type="radio"
                                  id={`${permission}-${level}`}
                                  className="h-5 w-5 cursor-pointer"
                                  checked={form.getValues().permissions[permission as keyof FormValues["permissions"]] === level}
                                  onChange={() => handlePermissionChange(permission as keyof FormValues["permissions"], level)}
                                />
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
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
                        <td className="py-1 text-right capitalize">
                          <span className={
                            value === "none" 
                              ? "text-muted-foreground" 
                              : value === "view"
                                ? "text-amber-500"
                                : "text-primary"
                          }>
                            {value}
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
                Create custom roles to manage access permissions for different team members
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
