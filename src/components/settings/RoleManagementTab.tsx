
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
import { AccessLevel, CustomRole, UserPermissions } from "@/types";
import { useForm } from "react-hook-form";
import { Shield, Pencil, X, Users, UserCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type FormValues = {
  name: string;
  description: string;
  userType: 'account' | 'guest';
  permissions: UserPermissions;
}

// Default form values for a new role
const defaultFormValues: FormValues = {
  name: "",
  description: "",
  userType: "account",
  permissions: {
    projects: "none",
    clients: "none",
    reports: "none",
    templates: "none",
    admin: "none",
    timeTracking: "none",
    tasks: "none",
    users: "none",
    teams: "none",
    billing: "none"
  }
};

// Default guest role permissions
const defaultGuestPermissions: UserPermissions = {
  projects: "view",
  clients: "none",
  reports: "none",
  templates: "none",
  admin: "none",
  timeTracking: "view",
  tasks: "view",
  users: "none",
  teams: "none",
  billing: "none"
};

export function RoleManagementTab() {
  const { customRoles, addCustomRole, updateCustomRole, deleteCustomRole } = useAppContext();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("account");

  const form = useForm<FormValues>({
    defaultValues: defaultFormValues
  });

  const handleEditRole = (role: CustomRole) => {
    form.reset({
      name: role.name,
      description: role.description || "",
      userType: role.userType || "account",
      permissions: role.permissions
    });
    setEditingRoleId(role.id);
    setIsEditing(true);
    setActiveTab(role.userType || "account");
  };

  const handleCancelEdit = () => {
    form.reset(defaultFormValues);
    setEditingRoleId(null);
    setIsEditing(false);
  };

  const handleCreateNewRole = (userType: 'account' | 'guest') => {
    const permissions = userType === 'guest' ? defaultGuestPermissions : defaultFormValues.permissions;
    form.reset({
      ...defaultFormValues,
      userType,
      permissions
    });
    setEditingRoleId(null);
    setIsEditing(true);
    setActiveTab(userType);
  };

  const onSubmit = (data: FormValues) => {
    const roleData: Omit<CustomRole, "id"> = {
      name: data.name,
      description: data.description,
      userType: data.userType,
      permissions: data.permissions
    };

    if (editingRoleId) {
      updateCustomRole(editingRoleId, roleData);
      toast({
        title: "Role Updated",
        description: `${data.name} has been updated successfully.`,
      });
    } else {
      addCustomRole(roleData);
      toast({
        title: "Role Created",
        description: `${data.name} has been created successfully.`,
      });
    }
    
    form.reset(defaultFormValues);
    setEditingRoleId(null);
    setIsEditing(false);
  };

  const handleDeleteRole = (id: string) => {
    deleteCustomRole(id);
    toast({
      title: "Role Deleted",
      description: "The role has been deleted successfully.",
    });
  };

  const permissionOptions: AccessLevel[] = ["none", "view", "edit", "admin"];
  const permissionKeys = Object.keys(defaultFormValues.permissions) as Array<keyof UserPermissions>;
  
  // Function to handle permission change
  const handlePermissionChange = (permission: keyof UserPermissions, level: AccessLevel) => {
    const currentPermissions = form.getValues("permissions");
    form.setValue("permissions", {
      ...currentPermissions,
      [permission]: level
    });
  };

  // Filter roles by type
  const accountRoles = customRoles.filter(role => role.userType === 'account' || !role.userType);
  const guestRoles = customRoles.filter(role => role.userType === 'guest');
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage custom roles with specific permissions for account users and guests
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Account Users
          </TabsTrigger>
          <TabsTrigger value="guest" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Guest Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Account User Roles</h3>
              <p className="text-sm text-muted-foreground">
                Roles for team members with full or partial access to the system
              </p>
            </div>
            {!isEditing && (
              <Button onClick={() => handleCreateNewRole('account')}>
                Create Account Role
              </Button>
            )}
          </div>

          {accountRoles.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accountRoles.map((role) => (
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
                                    : value === "edit"
                                      ? "text-blue-500"
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
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No account user roles defined</p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Create custom roles to manage access permissions for team members
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        <TabsContent value="guest" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Guest User Roles</h3>
              <p className="text-sm text-muted-foreground">
                Roles for external users with limited project access
              </p>
            </div>
            {!isEditing && (
              <Button onClick={() => handleCreateNewRole('guest')}>
                Create Guest Role
              </Button>
            )}
          </div>

          {guestRoles.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {guestRoles.map((role) => (
                <Card key={role.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-primary" />
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
                                    : value === "edit"
                                      ? "text-blue-500"
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
                  <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No guest user roles defined</p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Create guest roles for external users with limited project access
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>
      </Tabs>

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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  <div className="space-y-2">
                    <Label htmlFor="userType">User Type</Label>
                    <Select
                      value={form.watch("userType")}
                      onValueChange={(value: 'account' | 'guest') => form.setValue("userType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account User</SelectItem>
                        <SelectItem value="guest">Guest User</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <TableHead>Admin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissionKeys.map((permission) => {
                        const currentValue = form.watch(`permissions.${permission}`);
                        
                        return (
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
                                    name={`permissions.${permission}`}
                                    className="h-5 w-5 cursor-pointer"
                                    checked={currentValue === level}
                                    onChange={() => handlePermissionChange(permission, level)}
                                  />
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
    </div>
  );
}
