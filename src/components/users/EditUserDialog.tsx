
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
import { User, EmploymentType, BillingType, Role, ClientRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditUserDialogProps {
  user?: User;
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Must be a valid email"),
  role: z.enum(["admin", "user"]),
  customRoleId: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  teamIds: z.array(z.string()),
  employmentType: z.enum(["full-time", "contract", "part-time"]).optional(),
  billingType: z.enum(["hourly", "monthly"]).optional(),
  hourlyRate: z.number().optional(),
  monthlyRate: z.number().optional(),
  billingRate: z.number().optional(),
  currency: z.string().optional(),
  clientId: z.string().optional(),
  clientRole: z.enum(["admin", "team"]).optional(),
  permissions: z.object({
    canViewClients: z.boolean().default(false),
    canEditClients: z.boolean().default(false),
    canViewProjects: z.boolean().default(false),
    canEditProjects: z.boolean().default(false),
    canViewTasks: z.boolean().default(false),
    canEditTasks: z.boolean().default(false),
    canViewReports: z.boolean().default(false),
    canManageUsers: z.boolean().default(false),
  }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditUserDialog({ user, isOpen, onClose }: EditUserDialogProps) {
  const { addUser, updateUser, teams, clients, customRoles } = useAppContext();
  
  // Debug logging
  console.log('EditUserDialog render:', { 
    isOpen, 
    user: user?.name || 'new user', 
    teamsCount: teams?.length || 0,
    teamsData: teams
  });
  const { toast } = useToast();
  const isEditMode = !!user;
  const [activeTab, setActiveTab] = useState("details");
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "user",
      customRoleId: user?.customRoleId || undefined,
      status: user?.status || "active",
      teamIds: user?.teamIds || [],
      employmentType: user?.employmentType || "full-time",
      billingType: user?.billingType || "hourly",
      hourlyRate: user?.hourlyRate || 0,
      monthlyRate: user?.monthlyRate || 0,
      billingRate: user?.billingRate || 0,
      currency: user?.currency || "USD",
      clientId: user?.clientId || undefined,
      clientRole: (user?.clientRole as "admin" | "team") || "team",
      permissions: user?.permissions || {
        canViewClients: false,
        canEditClients: false,
        canViewProjects: false,
        canEditProjects: false,
        canViewTasks: false,
        canEditTasks: false,
        canViewReports: false,
        canManageUsers: false,
      },
    },
  });
  
  const watchRole = form.watch('role');
  const watchBillingType = form.watch('billingType');
  const watchClientRole = form.watch('clientRole');
  const watchTeamIds = form.watch('teamIds');
  
  // Update form values when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        customRoleId: user.customRoleId,
        status: user.status || "active",
        teamIds: user.teamIds,
        employmentType: user.employmentType || "full-time",
        billingType: user.billingType || "hourly",
        hourlyRate: user.hourlyRate || 0,
        monthlyRate: user.monthlyRate || 0,
        billingRate: user.billingRate || 0,
        currency: user.currency || "USD",
        clientId: user.clientId,
        clientRole: (user.clientRole as "admin" | "team") || "team",
        permissions: user.permissions || {
          canViewClients: false,
          canEditClients: false,
          canViewProjects: false,
          canEditProjects: false,
          canViewTasks: false,
          canEditTasks: false,
          canViewReports: false,
          canManageUsers: false,
        },
      });
    } else {
      form.reset({
        name: "",
        email: "",
        role: "user",
        customRoleId: undefined,
        status: "active",
        teamIds: [],
        employmentType: "full-time",
        billingType: "hourly",
        hourlyRate: 0,
        monthlyRate: 0,
        billingRate: 0,
        currency: "USD",
        clientRole: "team" as "admin" | "team",
        permissions: {
          canViewClients: false,
          canEditClients: false,
          canViewProjects: false,
          canEditProjects: false,
          canViewTasks: false,
          canEditTasks: false,
          canViewReports: false,
          canManageUsers: false,
        },
      });
    }
  }, [user, form]);
  
  const onSubmit = (values: FormValues) => {
    // For admin users, make sure they have all permissions
    if (values.role === "admin") {
      values.permissions = {
        canViewClients: true,
        canEditClients: true,
        canViewProjects: true,
        canEditProjects: true,
        canViewTasks: true,
        canEditTasks: true,
        canViewReports: true,
        canManageUsers: true,
      };
    } else {
      // Regular users get basic permissions
      values.permissions = {
        canViewClients: false,
        canEditClients: false,
        canViewProjects: true,
        canEditProjects: false,
        canViewTasks: true,
        canEditTasks: true,
        canViewReports: false,
        canManageUsers: false,
      };
    }
    
    // Set the correct rate based on billing type
    if (values.billingType === "hourly") {
      values.billingRate = values.hourlyRate;
      values.monthlyRate = undefined;
    } else {
      values.billingRate = values.monthlyRate;
      values.hourlyRate = undefined;
    }

    if (isEditMode && user) {
      updateUser(user.id, values);
      toast({ title: "Success", description: "User updated successfully" });
    } else {
      addUser({
        ...values,
        avatar: "",
        name: values.name,
        email: values.email,
        role: values.role,
        teamIds: values.teamIds || [],
      });
      toast({ title: "Success", description: "User created successfully" });
    }
    onClose();
  };

  // Toggle team selection
  const toggleTeamSelection = (teamId: string) => {
    const currentTeamIds = form.getValues('teamIds') || [];
    const isSelected = currentTeamIds.includes(teamId);
    
    let newTeamIds: string[];
    if (isSelected) {
      newTeamIds = currentTeamIds.filter(id => id !== teamId);
    } else {
      newTeamIds = [...currentTeamIds, teamId];
    }
    
    form.setValue('teamIds', newTeamIds, { shouldValidate: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Make changes to the user details below"
              : "Add a new user to your organization"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter user name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Custom Role Selection */}
                <FormField
                  control={form.control}
                  name="customRoleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Role (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a custom role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No Custom Role</SelectItem>
                          {customRoles?.map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Custom roles provide additional permissions beyond the base role
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* User Status */}
                {isEditMode && (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Inactive users cannot log in but their data is preserved
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="teamIds"
                  render={({ field }) => {
                    // Debug logging for render
                    console.log('Teams field render:', { 
                      teams: teams?.length || 0, 
                      teamsArray: teams,
                      fieldValue: field.value,
                      isArray: Array.isArray(teams)
                    });
                    
                    return (
                      <FormItem>
                        <FormLabel>Teams</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {!teams || !Array.isArray(teams) ? (
                              <div className="p-3 text-center text-sm text-muted-foreground border rounded-md">
                                Loading teams...
                              </div>
                            ) : teams.length === 0 ? (
                              <div className="p-3 text-center text-sm text-muted-foreground border rounded-md">
                                No teams available. Create teams from the Admin → Teams section.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                                {teams.filter(team => team && team.id && team.name).map((team) => (
                                  <div key={team.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`team-${team.id}`}
                                      checked={watchTeamIds?.includes(team.id) || false}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          toggleTeamSelection(team.id);
                                        } else {
                                          toggleTeamSelection(team.id);
                                        }
                                      }}
                                    />
                                    <Label 
                                      htmlFor={`team-${team.id}`} 
                                      className="cursor-pointer text-sm flex-1"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">{team.name}</span>
                                        {team.description && (
                                          <span className="text-xs text-muted-foreground">{team.description}</span>
                                        )}
                                      </div>
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Select the teams this user belongs to. {teams?.length || 0} team{(teams?.length || 0) !== 1 ? 's' : ''} available.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </TabsContent>
              
              <TabsContent value="billing" className="space-y-4">
                  <>
                    <FormField
                      control={form.control}
                      name="employmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employment Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employment type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="full-time">Full Time</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="part-time">Part Time</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="billingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select billing type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {watchBillingType === "hourly" ? (
                      <FormField
                        control={form.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly Rate</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Enter hourly rate" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="monthlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Rate</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Enter monthly rate" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="JPY">JPY (¥)</SelectItem>
                              <SelectItem value="AUD">AUD ($)</SelectItem>
                              <SelectItem value="CAD">CAD ($)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                     />
                  </>
              </TabsContent>
              
              <TabsContent value="permissions" className="space-y-4">
                {watchRole === "admin" ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Admin users have full access to all features.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">
                        Regular users have basic permissions. Use custom roles for additional permissions.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="permissions.canViewClients"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                View Clients
                              </FormLabel>
                              <FormDescription>
                                Can view client information
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="permissions.canEditClients"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Edit Clients
                              </FormLabel>
                              <FormDescription>
                                Can modify client information
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="permissions.canViewProjects"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                View Projects
                              </FormLabel>
                              <FormDescription>
                                Can view project details
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="permissions.canEditProjects"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Edit Projects
                              </FormLabel>
                              <FormDescription>
                                Can modify project details
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="permissions.canViewTasks"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                View Tasks
                              </FormLabel>
                              <FormDescription>
                                Can view task details
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="permissions.canEditTasks"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Edit Tasks
                              </FormLabel>
                              <FormDescription>
                                Can modify task details
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="permissions.canViewReports"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                View Reports
                              </FormLabel>
                              <FormDescription>
                                Can view analytics and reports
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="permissions.canManageUsers"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Manage Users
                              </FormLabel>
                              <FormDescription>
                                Can invite and manage team members
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
