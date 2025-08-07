import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building, Plus, Edit, Trash2, Users, Settings, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  domain: string | null;
  subscription_plan: string;
  max_users: number;
  max_guests: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  user_count?: number;
}

export default function OrganizationManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    domain: '',
    max_users: 5,
    max_guests: 2
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      console.log('Loading organizations...');
      
      // Load organizations with user counts
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Get user counts for each organization
      const orgsWithCounts = await Promise.all(
        (orgsData || []).map(async (org) => {
          const { count } = await supabase
            .from('user_organizations')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);
          
          return { ...org, user_count: count || 0 };
        })
      );

      setOrganizations(orgsWithCounts);
      console.log('Organizations loaded:', orgsWithCounts.length);

    } catch (error) {
      console.error('Error loading organizations:', error);
      toast({
        title: "Error",
        description: "Failed to load organizations",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingOrg) {
        // Update existing organization
        const { error } = await supabase
          .from('organizations')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            domain: formData.domain || null,
            max_users: formData.max_users,
            max_guests: formData.max_guests
          })
          .eq('id', editingOrg.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Organization updated successfully"
        });
      } else {
        // Create new organization
        const { error } = await supabase
          .from('organizations')
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            domain: formData.domain || null,
            max_users: formData.max_users,
            max_guests: formData.max_guests,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Organization created successfully"
        });
      }

      resetForm();
      loadOrganizations();
    } catch (error: any) {
      console.error('Error saving organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save organization",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      slug: org.slug,
      description: org.description || '',
      domain: org.domain || '',
      max_users: org.max_users,
      max_guests: org.max_guests
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization deleted successfully"
      });

      loadOrganizations();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      domain: '',
      max_users: 5,
      max_guests: 2
    });
    setEditingOrg(null);
    setIsCreateDialogOpen(false);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'pro':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'starter':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organization Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage client organizations and multi-tenant access
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? 'Edit Organization' : 'Create New Organization'}
              </DialogTitle>
              <DialogDescription>
                {editingOrg ? 'Update organization details' : 'Create a new client organization'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    placeholder="Acme Corporation"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        name,
                        slug: prev.slug === '' ? generateSlug(name) : prev.slug
                      }));
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    placeholder="acme-corp"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      slug: generateSlug(e.target.value)
                    }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the organization"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="acme.com"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Max Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="1"
                    value={formData.max_users}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      max_users: parseInt(e.target.value) || 1
                    }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxGuests">Max Guests</Label>
                  <Input
                    id="maxGuests"
                    type="number"
                    min="0"
                    value={formData.max_guests}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      max_guests: parseInt(e.target.value) || 0
                    }))}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingOrg ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            All client organizations in the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organizations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{org.name}</div>
                          {org.domain && (
                            <div className="text-sm text-muted-foreground">{org.domain}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">{org.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPlanBadgeColor(org.subscription_plan)} variant="outline">
                        {org.subscription_plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {org.user_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {org.max_users} users, {org.max_guests} guests
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* TODO: View organization details */}}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(org)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(org.id)}
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
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Organizations</h3>
              <p className="text-muted-foreground mb-4">
                Create your first organization to get started with multi-tenant management.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}