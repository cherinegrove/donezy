
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AccountSubscription, AccountLimits } from "@/types/subscription";
import { 
  CreditCard, 
  Plus, 
  Minus,
  DollarSign,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

export function BillingManager() {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  
  const [subscription, setSubscription] = useState<AccountSubscription | null>(null);
  const [accountLimits, setAccountLimits] = useState<AccountLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchSubscriptionData();
      fetchAccountLimits();
    }
  }, [currentUser]);

  const fetchSubscriptionData = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('account_subscriptions')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
      
      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchAccountLimits = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase.rpc('get_account_limits', {
        account_user_id: currentUser.id
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

  const handleAddGuest = async () => {
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
        .eq('user_id', currentUser.id);

      if (error) throw error;

      toast({
        title: "Guest Slot Added",
        description: `Added 1 guest slot for $1.00/month. New total: $${newCost.toFixed(2)}/month`,
      });

      fetchSubscriptionData();
      fetchAccountLimits();
    } catch (error) {
      console.error('Error adding guest slot:', error);
      toast({
        title: "Error",
        description: "Failed to add guest slot",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGuest = async () => {
    if (!subscription || !currentUser || subscription.additional_guests <= 0) return;
    
    // Check if removing would go below current usage
    if (accountLimits && accountLimits.current_guests >= (subscription.max_guests + subscription.additional_guests - 1)) {
      toast({
        title: "Cannot Remove Guest Slot",
        description: "You have guests using this slot. Remove guests first.",
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
        .eq('user_id', currentUser.id);

      if (error) throw error;

      toast({
        title: "Guest Slot Removed",
        description: `Removed 1 guest slot. Savings: $1.00/month. New total: $${newCost.toFixed(2)}/month`,
      });

      fetchSubscriptionData();
      fetchAccountLimits();
    } catch (error) {
      console.error('Error removing guest slot:', error);
      toast({
        title: "Error",
        description: "Failed to remove guest slot",
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
          <div className="text-center">Loading billing information...</div>
        </CardContent>
      </Card>
    );
  }

  const totalGuestSlots = subscription.max_guests + subscription.additional_guests;
  const usedGuests = accountLimits?.current_guests || 0;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
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
                <h3 className="font-semibold capitalize">{subscription.plan_type} Plan</h3>
                <p className="text-sm text-muted-foreground">
                  {subscription.max_users} user{subscription.max_users !== 1 ? 's' : ''} + {totalGuestSlots} guest{totalGuestSlots !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">${subscription.monthly_cost.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </div>

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
          </div>
        </CardContent>
      </Card>

      {/* Guest Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Guest Billing
          </CardTitle>
          <CardDescription>
            Add or remove guest slots ($1.00 per guest per month)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{subscription.max_guests}</div>
                <div className="text-sm text-muted-foreground">Free guests</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{subscription.additional_guests}</div>
                <div className="text-sm text-muted-foreground">Paid guests</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{usedGuests} / {totalGuestSlots}</div>
                <div className="text-sm text-muted-foreground">Used slots</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveGuest}
                disabled={subscription.additional_guests <= 0 || loading}
              >
                <Minus className="h-4 w-4 mr-2" />
                Remove Guest Slot
              </Button>
              <span className="text-sm text-muted-foreground">
                {subscription.additional_guests} additional slots
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddGuest}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Guest Slot
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Additional guests: ${subscription.additional_guests.toFixed(2)} × $1.00 = ${subscription.additional_guests.toFixed(2)}/month
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
