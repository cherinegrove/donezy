import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building, Users, ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  user_count?: number;
}

interface OrganizationSwitcherProps {
  currentOrgId?: string;
  onOrganizationChange?: (orgId: string) => void;
  className?: string;
}

export default function OrganizationSwitcher({ 
  currentOrgId, 
  onOrganizationChange,
  className = ""
}: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (currentOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === currentOrgId);
      if (org) {
        setSelectedOrg(org);
      }
    }
  }, [currentOrgId, organizations]);

  const loadOrganizations = async () => {
    try {
      // Load organizations with user counts
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, subscription_plan')
        .order('name');

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

      // Set first organization as default if none selected
      if (!selectedOrg && orgsWithCounts.length > 0) {
        setSelectedOrg(orgsWithCounts[0]);
        onOrganizationChange?.(orgsWithCounts[0].id);
      }

    } catch (error) {
      console.error('Error loading organizations:', error);
      toast({
        title: "Error",
        description: "Failed to load organizations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationSelect = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setSelectedOrg(org);
      onOrganizationChange?.(orgId);
      setIsOpen(false);
      
      toast({
        title: "Organization Switched",
        description: `Now viewing ${org.name}`,
      });
    }
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

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-muted rounded-md w-48"></div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className={className}>
        <Button variant="outline" disabled>
          <Building className="h-4 w-4 mr-2" />
          No Organizations
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-[250px] justify-between"
          >
            {selectedOrg ? (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="truncate">{selectedOrg.name}</span>
                <Badge 
                  className={`ml-auto ${getPlanBadgeColor(selectedOrg.subscription_plan)}`} 
                  variant="outline"
                >
                  {selectedOrg.subscription_plan}
                </Badge>
              </div>
            ) : (
              <span>Select organization...</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
          <div className="max-h-60 overflow-y-auto">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer"
                onClick={() => handleOrganizationSelect(org.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Building className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{org.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{org.slug}</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{org.user_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={getPlanBadgeColor(org.subscription_plan)} 
                    variant="outline"
                  >
                    {org.subscription_plan}
                  </Badge>
                  {selectedOrg?.id === org.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}