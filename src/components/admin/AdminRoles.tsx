
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CustomRole, AccessLevel } from "@/types";
import { Shield, Plus, Edit, Trash2, Save, X } from "lucide-react";

interface FeaturePermissions {
  dashboard: AccessLevel;
  projects: AccessLevel;
  tasks: AccessLevel;
  timeTracking: AccessLevel;
  clients: AccessLevel;
  teams: AccessLevel;
  users: AccessLevel;
  reports: AccessLevel;
  messages: AccessLevel;
  notes: AccessLevel;
  settings: AccessLevel;
}

const defaultPermissions: FeaturePermissions = {
  dashboard: 'none',
  projects: 'none',
  tasks: 'none',
  timeTracking: 'none',
  clients: 'none',
  teams: 'none',
  users: 'none',
  reports: 'none',
  messages: 'none',
  notes: 'none',
  settings: 'none'
};

const featureLabels = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  tasks: 'Tasks',
  timeTracking: 'Time Tracking',
  clients: 'Clients',
  teams: 'Teams',
  users: 'User Management',
  reports: 'Reports',
  messages: 'Messages',
  notes: 'Notes',
  settings: 'Settings'
};

const accessLevels: { value: AccessLevel; label: string; color: string }[] = [
  { value: 'none', label: 'No Access', color: 'bg-gray-100 text-gray-800' },
  { value: 'view', label: 'View Only', color: 'bg-blue-100 text-blue-800' },
  { value: 'edit', label: 'Edit', color: 'bg-green-100 text-green-800' },
  { value: 'delete', label: 'Delete', color: 'bg-red-100 text-red-800' }
];

export default function AdminRoles() {
  const { customRoles, addCustomRole, updateCustomRole, deleteCustomRole } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: defaultPermissions
  });

  const handleCreateRole = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      description: '',
      permissions: defaultPermissions
    });
  };

  const handleEditRole = (role: CustomRole) => {
    setEditingRole(role.id);
    // Convert the role permissions to FeaturePermissions format
    const rolePermissions: FeaturePermissions = {
      dashboard: (role.permissions.dashboard as AccessLevel) || 'none',
      projects: (role.permissions.projects as AccessLevel) || 'none',
      tasks: (role.permissions.tasks as AccessLevel) || 'none',
      timeTracking: (role.permissions.timeTracking as AccessLevel) || 'none',
      clients: (role.permissions.clients as AccessLevel) || 'none',
      teams: (role.permissions.teams as AccessLevel) || 'none',
      users: (role.permissions.users as AccessLevel) || 'none',
      reports: (role.permissions.reports as AccessLevel) || 'none',
      messages: (role.permissions.messages as AccessLevel) || 'none',
      notes: (role.permissions.notes as AccessLevel) || 'none',
      settings: (role.permissions.settings as AccessLevel) || 'none'
    };
    
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: rolePermissions
    });
  };

  const handleSaveRole = () => {
    // Convert FeaturePermissions to Record<string, AccessLevel> for storage
    const permissionsRecord: Record<string, AccessLevel> = {
      dashboard: formData.permissions.dashboard,
      projects: formData.permissions.projects,
      tasks: formData.permissions.tasks,
      timeTracking: formData.permissions.timeTracking,
      clients: formData.permissions.clients,
      teams: formData.permissions.teams,
      users: formData.permissions.users,
      reports: formData.permissions.reports,
      messages: formData.permissions.messages,
      notes: formData.permissions.notes,
      settings: formData.permissions.settings
    };

    if (editingRole) {
      updateCustomRole(editingRole, {
        name: formData.name,
        description: formData.description,
        permissions: permissionsRecord
      });
      setEditingRole(null);
    } else {
      addCustomRole({
        name: formData.name,
        description: formData.description,
        permissions: permissionsRecord
      });
      setIsCreating(false);
    }
    
    setFormData({
      name: '',
      description: '',
      permissions: defaultPermissions
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: defaultPermissions
    });
  };

  const handlePermissionChange = (feature: keyof FeaturePermissions, level: AccessLevel) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [feature]: level
      }
    }));
  };

  const handleDeleteRole = (roleId: string) => {
    deleteCustomRole(roleId);
  };

  const getAccessLevelBadge = (level: AccessLevel) => {
    const accessLevel = accessLevels.find(al => al.value === level);
    return (
      <Badge className={accessLevel?.color} variant="outline">
        {accessLevel?.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage custom roles with granular permissions
          </p>
        </div>
        {!isCreating && !editingRole && (
          <Button onClick={handleCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      {/* Create/Edit Role Form */}
      {(isCreating || editingRole) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </CardTitle>
            <CardDescription>
              {editingRole ? 'Update role details and permissions' : 'Define a new role with specific access levels'}
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

            <div>
              <h3 className="text-lg font-medium mb-4">Feature Permissions</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead className="text-center">No Access</TableHead>
                      <TableHead className="text-center">View Only</TableHead>
                      <TableHead className="text-center">Edit</TableHead>
                      <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(featureLabels).map(([feature, label]) => (
                      <TableRow key={feature}>
                        <TableCell className="font-medium">{label}</TableCell>
                        {accessLevels.map(({ value }) => (
                          <TableCell key={`${feature}-${value}`} className="text-center">
                            <input
                              type="radio"
                              name={feature}
                              value={value}
                              checked={formData.permissions[feature as keyof FeaturePermissions] === value}
                              onChange={() => handlePermissionChange(feature as keyof FeaturePermissions, value)}
                              className="h-4 w-4 cursor-pointer"
                            />
                          </TableCell>
                        ))}
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
            <Card key={role.id}>
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(role.permissions).map(([feature, level]) => (
                    <div key={feature} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{featureLabels[feature as keyof typeof featureLabels] || feature}</span>
                      {getAccessLevelBadge(level as AccessLevel)}
                    </div>
                  ))}
                </div>
              </CardContent>
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
                Create custom roles to manage granular permissions for different team members across all features.
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
