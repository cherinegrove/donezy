import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AccountSubscription, AccountLimits } from "@/types/subscription";
import { 
  Users, 
  Plus, 
  Minus, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  UserPlus,
  DollarSign,
  Crown,
  Zap
} from "lucide-react";

export function SubscriptionManager() {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  
  const [subscription, setSubscription] = useState<AccountSubscription | null>(null);
  const [accountLimits, setAccountLimits] = useState<AccountLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchSubscriptionData();
      fetchAccountLimits();
    }
  }, [currentUser]);

  const fetchSubscriptionData = async () => {
    if (!currentUser) return;
    
    try {
      console.log('Fetching subscription for user:', currentUser.auth_user_id);
      
      // First try to get existing subscription
      const { data, error } = await supabase
        .from('account_subscriptions')
        .select('*')
        .eq('user_id', currentUser.auth_user_id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching subscription:', error);
        throw error;
      }
      
      if (data) {
        // Subscription exists, use it
        const typedData: AccountSubscription = {
          ...data,
          plan_type: data.plan_type as 'free' | 'paid',
          status: data.status as 'active' | 'cancelled' | 'past_due'
        };
        console.log('Found existing subscription:', typedData);
        setSubscription(typedData);
      } else {
        // No subscription exists, create a default one
        console.log('No subscription found, creating default subscription');
        
        const defaultSubscription = {
          user_id: currentUser.auth_user_id,
          plan_type: 'free',
          max_users: 1,
          max_guests: 1,
          additional_guests: 0,
          monthly_cost: 0.00,
          status: 'active'
        };
        
        const { data: newData, error: insertError } = await supabase
          .from('account_subscriptions')
          .insert(defaultSubscription)
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating default subscription:', insertError);
          throw insertError;
        }
        
        const typedNewData: AccountSubscription = {
          ...newData,
          plan_type: newData.plan_type as 'free' | 'paid',
          status: newData.status as 'active' | 'cancelled' | 'past_due'
        };
        
        console.log('Created default subscription:', typedNewData);
        setSubscription(typedNewData);
      }
    } catch (error) {
      console.error('Error in fetchSubscriptionData:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive",
      });
    }
  };

  const fetchAccountLimits = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase.rpc('get_account_limits', {
        account_user_id: currentUser.auth_user_id
      });
      
      if (error) throw error;
      if (data && data.length > 0) {
        setAccountLimits(data[0]);
      }
    } catch (error) {
      console.error('Error fetching account limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToPaid = async () => {
    if (!currentUser) return;
    
    try {
      setCheckoutLoading(true);
      
      // This would typically call a Supabase edge function to create a Stripe checkout session
      // For now, we'll simulate upgrading to paid plan directly
      const { error } = await supabase
        .from('account_subscriptions')
        .update({
          plan_type: 'paid',
          max_users: 5, // Paid plan starts with 5 users
          monthly_cost: 25.00, // Base paid plan cost
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.auth_user_id);

      if (error) throw error;

      toast({
        title: "Plan Upgraded",
        description: "Successfully upgraded to paid plan!",
      });

      fetchSubscriptionData();
      fetchAccountLimits();
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: "Error",
        description: "Failed to upgrade plan",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAddUserSeat = async () => {
    if (!subscription || !currentUser) return;
    
    try {
      setLoading(true);
      
      const newMaxUsers = subscription.max_users + 1;
      const newCost = subscription.monthly_cost + 5.00; // $5 per user seat
      
      const { error } = await supabase
        .from('account_subscriptions')
        .update({
          max_users: newMaxUsers,
          monthly_cost: newCost,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.auth_user_id);

      if (error) throw error;

      toast({
        title: "User Seat Added",
        description: `Added 1 user seat for $5.00/month. New total: $${newCost.toFixed(2)}/month`,
      });

      fetchSubscriptionData();
      fetchAccountLimits();
    } catch (error) {
      console.error('Error adding user seat:', error);
      toast({
        title: "Error",
        description: "Failed to add user seat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUserSeat = async () => {
    if (!subscription || !currentUser || subscription.max_users <= 1) return;
    
    // Check if removing would go below current usage
    if (accountLimits && accountLimits.current_users >= subscription.max_users - 1) {
      toast({
        title: "Cannot Remove User Seat",
        description: "You have users using this seat. Remove users first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const newMaxUsers = Math.max(1, subscription.max_users - 1);
      const newCost = Math.max(0, subscription.monthly_cost - 5.00);
      
      const { error } = await supabase
        .from('account_subscriptions')
        .update({
          max_users: newMaxUsers,
          monthly_cost: newCost,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.auth_user_id);

      if (error) throw error;

      toast({
        title: "User Seat Removed",
        description: `Removed 1 user seat. Savings: $5.00/month. New total: $${newCost.toFixed(2)}/month`,
      });

      fetchSubscriptionData();
      fetchAccountLimits();
    } catch (error) {
      console.error('Error removing user seat:', error);
      toast({
        title: "Error",
        description: "Failed to remove user seat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuestSeat = async () => {
    if (!subscription || !currentUser) return;
    
    try {
      setLoading(true);
      
      const newCost = subscription.monthly_cost + 1.00;
      const newAdditionalGuests = subscription.additional_guests + 1;
      
      const { error } = await supabase
        .from('account_subscriptions')
        .update({
          additional_guests: newAdditionalGuests,
          monthly_cost: newCost,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.auth_user_id);

      if (error) throw error;

      toast({
        title: "Guest Seat Added",
        description: `Added 1 guest seat for $1.00/month. New total: $${newCost.toFixed(2)}/month`,
      });

      fetchSubscriptionData();
      fetchAccountLimits();
    } catch (error) {
      console.error('Error adding guest seat:', error);
      toast({
        title: "Error",
        description: "Failed to add guest seat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGuestSeat = async () => {
    if (!subscription || !currentUser || subscription.additional_guests <= 0) return;
    
    // Check if removing would go below current usage
    const totalGuestSlots = subscription.max_guests + subscription.additional_guests;
    if (accountLimits && accountLimits.current_guests >= totalGuestSlots - 1) {
      toast({
        title: "Cannot Remove Guest Seat",
        description: "You have guests using this seat. Remove guests first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const newCost = Math.max(0, subscription.monthly_cost - 1.00);
      const newAdditionalGuests = Math.max(0, subscription.additional_guests - 1);
      
      const { error } = await supabase
        .from('account_subscriptions')
        .update({
          additional_guests: newAdditionalGuests,
          monthly_cost: newCost,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.auth_user_id);

      if (error) throw error;

      toast({
        title: "Guest Seat Removed",
        description: `Removed 1 guest seat. Savings: $1.00/month. New total: $${newCost.toFixed(2)}/month`,
      });

      fetchSubscriptionData();
      fetchAccountLimits();
    } catch (error) {
      console.error('Error removing guest seat:', error);
      toast({
        title: "Error",
        description: "Failed to remove guest seat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !subscription) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading subscription information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalGuestSlots = subscription.max_guests + subscription.additional_guests;
  const usedUsers = accountLimits?.current_users || 0;
  const usedGuests = accountLimits?.current_guests || 0;
  const userUsagePercentage = (usedUsers / subscription.max_users) * 100;
  const guestUsagePercentage = (usedGuests / totalGuestSlots) * 100;

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Current Plan
          </CardTitle>
          <CardDescription>
            Your subscription details and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold capitalize flex items-center gap-2">
                  {subscription.plan_type === 'paid' && <Crown className="h-4 w-4 text-yellow-500" />}
                  {subscription.plan_type} Plan
                </h3>
                <p className="text-sm text-muted-foreground">
                  {subscription.max_users} user seat{subscription.max_users !== 1 ? 's' : ''} + {totalGuestSlots} guest seat{totalGuestSlots !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">${subscription.monthly_cost.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Badge 
                variant="outline" 
                className={subscription.status === 'active' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}
              >
                {subscription.status === 'active' ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {subscription.status}
                  </>
                )}
              </Badge>

              {subscription.plan_type === 'free' && (
                <Button 
                  onClick={handleUpgradeToPaid}
                  disabled={checkoutLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {checkoutLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Upgrading...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade to Paid
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Plan Management and Billing */}
      <Tabs defaultValue="plan-management" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plan-management">Plan Management</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="plan-management" className="space-y-6">
          {/* User Seats Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Seats
              </CardTitle>
              <CardDescription>
                Manage user seats ($5.00 per user per month)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{usedUsers} of {subscription.max_users} user seats used</span>
                  <span>{Math.round(userUsagePercentage)}%</span>
                </div>
                <Progress 
                  value={userUsagePercentage} 
                  className={`h-2 ${userUsagePercentage >= 100 ? 'bg-red-100' : userUsagePercentage >= 80 ? 'bg-yellow-100' : 'bg-blue-100'}`}
                />
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveUserSeat}
                  disabled={subscription.max_users <= 1 || usedUsers >= subscription.max_users || loading || subscription.plan_type === 'free'}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Remove User Seat
                </Button>
                <span className="text-sm text-muted-foreground">
                  {subscription.max_users} user seats
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddUserSeat}
                  disabled={loading || subscription.plan_type === 'free'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User Seat
                </Button>
              </div>

              {subscription.plan_type === 'free' && (
                <div className="text-center text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
                  Upgrade to a paid plan to manage user seats
                </div>
              )}

              {subscription.plan_type === 'paid' && (
                <div className="text-center text-sm text-muted-foreground">
                  User seats: {subscription.max_users} × $5.00 = ${(subscription.max_users * 5).toFixed(2)}/month
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guest Seats Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Guest Seats
              </CardTitle>
              <CardDescription>
                Manage guest seats ($1.00 per guest per month)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{subscription.max_guests}</div>
                  <div className="text-sm text-muted-foreground">Free guest seats</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{subscription.additional_guests}</div>
                  <div className="text-sm text-muted-foreground">Paid guest seats</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{usedGuests} / {totalGuestSlots}</div>
                  <div className="text-sm text-muted-foreground">Used guest seats</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{usedGuests} of {totalGuestSlots} guest seats used</span>
                  <span>{Math.round(guestUsagePercentage)}%</span>
                </div>
                <Progress 
                  value={guestUsagePercentage} 
                  className={`h-2 ${guestUsagePercentage >= 100 ? 'bg-red-100' : guestUsagePercentage >= 80 ? 'bg-yellow-100' : 'bg-green-100'}`}
                />
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveGuestSeat}
                  disabled={subscription.additional_guests <= 0 || loading}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Remove Guest Seat
                </Button>
                <span className="text-sm text-muted-foreground">
                  {subscription.additional_guests} additional guest seats
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddGuestSeat}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Guest Seat
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Additional guest seats: {subscription.additional_guests} × $1.00 = ${subscription.additional_guests.toFixed(2)}/month
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {/* Billing Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Billing Overview
              </CardTitle>
              <CardDescription>
                Detailed breakdown of your monthly charges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Base Plan ({subscription.plan_type})</span>
                    <span className="font-mono">
                      ${subscription.plan_type === 'free' ? '0.00' : '25.00'}
                    </span>
                  </div>
                  
                  {subscription.plan_type === 'paid' && subscription.max_users > 5 && (
                    <div className="flex justify-between items-center text-sm">
                      <span>Additional User Seats ({subscription.max_users - 5} × $5.00)</span>
                      <span className="font-mono">${((subscription.max_users - 5) * 5).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {subscription.additional_guests > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span>Additional Guest Seats ({subscription.additional_guests} × $1.00)</span>
                      <span className="font-mono">${subscription.additional_guests.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3 flex justify-between items-center font-semibold">
                    <span>Monthly Total</span>
                    <span className="font-mono text-lg">${subscription.monthly_cost.toFixed(2)}</span>
                  </div>
                </div>

                {subscription.plan_type === 'paid' && (
                  <div className="text-sm text-muted-foreground bg-green-50 p-3 rounded-md">
                    <p>✓ Your subscription includes:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>5 user seats (additional seats: $5/month each)</li>
                      <li>1 guest seat (additional guests: $1/month each)</li>
                      <li>Unlimited projects and tasks</li>
                      <li>Premium support</li>
                    </ul>
                  </div>
                )}

                {subscription.plan_type === 'free' && (
                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
                    <p>🚀 Upgrade to unlock:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Up to 5 user seats included</li>
                      <li>Additional user and guest seats</li>
                      <li>Advanced project management features</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
