import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomRole } from "@/types";
import { Shield, Plus, Edit, Trash2, Save, X, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FeaturePermissions {
  dashboard: string[];
  projects: string[];
  tasks: string[];
  timeTracking: string[];
  notifications: string[];
  reports: string[];
  adminDashboard: string[];
  users: string[];
  billing: string[];
  dataImport: string[];
  clients: string[];
  accountRoles: string[];
  activityLog: string[];
  accountSettings: string[];
}

const defaultPermissions: FeaturePermissions = {
  dashboard: [],
  projects: [],
  tasks: [],
  timeTracking: [],
  notifications: [],
  reports: [],
  adminDashboard: [],
  users: [],
  billing: [],
  dataImport: [],
  clients: [],
  accountRoles: [],
  activityLog: [],
  accountSettings: []
};

const permissionOptions = {
  dashboard: ['View-own', 'View-team', 'View-All'],
  projects: ['View-own', 'View-team', 'View-All', 'Create/Edit', 'Delete'],
  tasks: ['View-own', 'View-team', 'View-All', 'Create/Edit', 'Delete'],
  timeTracking: ['Create timer', 'Approve timer', 'Edit timer', 'Delete', 'View-own', 'View-team', 'View-All'],
  notifications: ['View-own', 'View-team', 'View-All'],
  reports: ['View'],
  adminDashboard: ['Access'],
  users: ['View', 'Create', 'Delete'],
  billing: ['View', 'Edit'],
  dataImport: ['Yes', 'No'],
  clients: ['View', 'Edit', 'Delete'],
  accountRoles: ['View', 'Edit', 'Delete'],
  activityLog: ['Yes', 'No'],
  accountSettings: ['Yes', 'No']
};

const featureLabels = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  tasks: 'Tasks',
  timeTracking: 'Time Tracking',
  notifications: 'Notifications',
  reports: 'Reports',
  adminDashboard: 'Admin Dashboard',
  users: 'Users',
  billing: 'Billing',
  dataImport: 'Data Import',
  clients: 'Clients',
  accountRoles: 'Account Roles',
  activityLog: 'Activity Log',
  accountSettings: 'Account Settings'
};

export default function AdminRoles() {
  const { customRoles, addCustomRole, updateCustomRole, deleteCustomRole } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: defaultPermissions,
    color: '#10b981'
  });

  const handleCreateRole = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      description: '',
      permissions: defaultPermissions,
      color: '#10b981'
    });
  };

  const handleEditRole = (role: CustomRole) => {
    setEditingRole(role.id);
    // Convert the role permissions to FeaturePermissions format
    const rolePermissions: FeaturePermissions = {
      dashboard: Array.isArray(role.permissions.dashboard) ? role.permissions.dashboard : [],
      projects: Array.isArray(role.permissions.projects) ? role.permissions.projects : [],
      tasks: Array.isArray(role.permissions.tasks) ? role.permissions.tasks : [],
      timeTracking: Array.isArray(role.permissions.timeTracking) ? role.permissions.timeTracking : [],
      notifications: Array.isArray(role.permissions.notifications) ? role.permissions.notifications : [],
      reports: Array.isArray(role.permissions.reports) ? role.permissions.reports : [],
      adminDashboard: Array.isArray(role.permissions.adminDashboard) ? role.permissions.adminDashboard : [],
      users: Array.isArray(role.permissions.users) ? role.permissions.users : [],
      billing: Array.isArray(role.permissions.billing) ? role.permissions.billing : [],
      dataImport: Array.isArray(role.permissions.dataImport) ? role.permissions.dataImport : [],
      clients: Array.isArray(role.permissions.clients) ? role.permissions.clients : [],
      accountRoles: Array.isArray(role.permissions.accountRoles) ? role.permissions.accountRoles : [],
      activityLog: Array.isArray(role.permissions.activityLog) ? role.permissions.activityLog : [],
      accountSettings: Array.isArray(role.permissions.accountSettings) ? role.permissions.accountSettings : []
    };
    
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: rolePermissions,
      color: role.color || '#10b981'
    });
  };

  const handleSaveRole = () => {
    // Convert FeaturePermissions to Record<string, any> for storage (compatible with existing type)
    const permissionsRecord: Record<string, any> = {
      dashboard: formData.permissions.dashboard,
      projects: formData.permissions.projects,
      tasks: formData.permissions.tasks,
      timeTracking: formData.permissions.timeTracking,
      notifications: formData.permissions.notifications,
      reports: formData.permissions.reports,
      adminDashboard: formData.permissions.adminDashboard,
      users: formData.permissions.users,
      billing: formData.permissions.billing,
      dataImport: formData.permissions.dataImport,
      clients: formData.permissions.clients,
      accountRoles: formData.permissions.accountRoles,
      activityLog: formData.permissions.activityLog,
      accountSettings: formData.permissions.accountSettings
    };

    if (editingRole) {
      updateCustomRole(editingRole, {
        name: formData.name,
        description: formData.description,
        permissions: permissionsRecord as any,
        color: formData.color
      });
      setEditingRole(null);
    } else {
      addCustomRole({
        name: formData.name,
        description: formData.description,
        permissions: permissionsRecord as any,
        color: formData.color
      });
      setIsCreating(false);
    }
    
    setFormData({
      name: '',
      description: '',
      permissions: defaultPermissions,
      color: '#10b981'
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: defaultPermissions,
      color: '#10b981'
    });
  };

  const handlePermissionToggle = (feature: keyof FeaturePermissions, permission: string) => {
    setFormData(prev => {
      const currentPermissions = prev.permissions[feature];
      const isSelected = currentPermissions.includes(permission);
      
      const newPermissions = isSelected
        ? currentPermissions.filter(p => p !== permission)
        : [...currentPermissions, permission];

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [feature]: newPermissions
        }
      };
    });
  };

  const handleDeleteRole = (roleId: string) => {
    deleteCustomRole(roleId);
  };

  // Built-in role definitions
  const builtInRoles = [
    {
      name: "Admin",
      description: "Full system access with all permissions",
      color: "#ef4444",
      permissions: {
        dashboard: ['View-own', 'View-team', 'View-All'],
        projects: ['View-own', 'View-team', 'View-All', 'Create/Edit', 'Delete'],
        tasks: ['View-own', 'View-team', 'View-All', 'Create/Edit', 'Delete'],
        timeTracking: ['Create timer', 'Approve timer', 'Edit timer', 'Delete', 'View-own', 'View-team', 'View-All'],
        notifications: ['View-own', 'View-team', 'View-All'],
        reports: ['View'],
        adminDashboard: ['Access'],
        users: ['View', 'Create', 'Delete'],
        billing: ['View', 'Edit'],
        dataImport: ['Yes'],
        clients: ['View', 'Edit', 'Delete'],
        accountRoles: ['View', 'Edit', 'Delete'],
        activityLog: ['Yes'],
        accountSettings: ['Yes']
      }
    },
    {
      name: "User",
      description: "Standard user with limited access",
      color: "#3b82f6",
      permissions: {
        dashboard: ['View-own'],
        projects: ['View-own', 'View-team'],
        tasks: ['View-own', 'View-team', 'Create/Edit'],
        timeTracking: ['Create timer', 'View-own'],
        notifications: ['View-own'],
        reports: ['View'],
        adminDashboard: [],
        users: [],
        billing: [],
        dataImport: [],
        clients: ['View'],
        accountRoles: [],
        activityLog: [],
        accountSettings: []
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage custom roles with feature-specific permissions
          </p>
        </div>
        {!isCreating && !editingRole && (
          <Button onClick={handleCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      {/* Permission Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Role Permissions:</strong> Select specific permissions for each feature. Multiple permissions can be selected for each feature area.
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
          <div className="grid gap-4">
            {builtInRoles.map((role) => (
              <Card key={role.name} className="overflow-hidden">
                <div className="flex">
                  {/* Color block on the left */}
                  <div 
                    className="w-1 min-h-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <div className="flex-1">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          <CardDescription className="mt-1">{role.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(role.permissions).map(([feature, permissions]) => {
                          const permissionArray = Array.isArray(permissions) ? permissions : [];
                          if (permissionArray.length === 0) return null;
                          
                          return (
                            <div key={feature} className="flex items-center justify-between text-sm">
                              <span className="font-medium">{featureLabels[feature as keyof typeof featureLabels] || feature}</span>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {permissionArray.map((permission: string) => (
                                  <Badge key={permission} variant="outline" className="text-xs">
                                    {permission}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Role Form */}
      {(isCreating || editingRole) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </CardTitle>
            <CardDescription>
              {editingRole ? 'Update role details and permissions' : 'Define a new role with specific feature permissions'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roleName">Role Name</Label>
                <Input
                  id="roleName"
                  placeholder="e.g., Project Manager"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Input
                  id="roleDescription"
                  placeholder="Brief role description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-color">Role Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="role-color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 border border-input rounded-md cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#10b981"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Role Permissions</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Feature</TableHead>
                      <TableHead>Permissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(featureLabels).map(([feature, label]) => (
                      <TableRow key={feature}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {(permissionOptions[feature as keyof typeof permissionOptions] || []).map(permission => {
                              const featurePermissions = formData.permissions[feature as keyof FeaturePermissions] || [];
                              return (
                                <Button
                                  key={permission}
                                  variant={featurePermissions.includes(permission) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePermissionToggle(feature as keyof FeaturePermissions, permission)}
                                  className="text-xs h-7"
                                >
                                  {permission}
                                </Button>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveRole} disabled={!formData.name.trim()}>
                <Save className="h-4 w-4 mr-2" />
                {editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Roles */}
      {customRoles.length > 0 ? (
        <div className="grid gap-4">
          {customRoles.map((role) => (
            <Card key={role.id} className="overflow-hidden">
              <div className="flex">
                {/* Color block on the left */}
                <div 
                  className="w-1 min-h-full"
                  style={{ backgroundColor: role.color || '#10b981' }}
                />
                <div className="flex-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          {role.description && (
                            <CardDescription className="mt-1">{role.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(role.permissions).map(([feature, permissions]) => {
                        const permissionArray = Array.isArray(permissions) ? permissions : [];
                        if (permissionArray.length === 0) return null;
                        
                        return (
                          <div key={feature} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{featureLabels[feature as keyof typeof featureLabels] || feature}</span>
                            <div className="flex flex-wrap gap-1">
                              {permissionArray.map((permission: string) => (
                                <Badge key={permission} variant="outline" className="text-xs">
                                  {permission}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        !isCreating && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Custom Roles</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Create custom roles to manage feature-specific permissions for different team members.
              </p>
              <Button onClick={handleCreateRole}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Role
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
