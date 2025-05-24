
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/contexts/AppContext";
import { 
  Users, 
  Plus, 
  Minus, 
  CreditCard, 
  AlertTriangle,
  CheckCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SubscriptionManager() {
  const { users } = useAppContext();
  const { toast } = useToast();
  
  // Mock subscription data - in real app this would come from your subscription service
  const [subscriptionData, setSubscriptionData] = useState({
    totalSeats: 10,
    usedSeats: users.length,
    plan: "Professional",
    billing: "monthly",
    nextBilling: "2024-02-15",
    cost: 50, // $5 per seat * 10 seats
  });

  const handleAddSeat = () => {
    setSubscriptionData(prev => ({
      ...prev,
      totalSeats: prev.totalSeats + 1,
      cost: prev.cost + 5 // $5 per seat
    }));
    toast({
      title: "Success",
      description: "Seat added successfully. Changes will be reflected in your next billing cycle.",
    });
  };

  const handleRemoveSeat = () => {
    if (subscriptionData.totalSeats <= subscriptionData.usedSeats) {
      toast({
        title: "Cannot Remove Seat",
        description: "You cannot remove seats when all seats are currently in use.",
        variant: "destructive",
      });
      return;
    }

    setSubscriptionData(prev => ({
      ...prev,
      totalSeats: prev.totalSeats - 1,
      cost: Math.max(0, prev.cost - 5) // $5 per seat
    }));
    toast({
      title: "Success",
      description: "Seat removed successfully. Changes will be reflected in your next billing cycle.",
    });
  };

  const usagePercentage = (subscriptionData.usedSeats / subscriptionData.totalSeats) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription Management
        </CardTitle>
        <CardDescription>
          Manage your team seats and subscription details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div>
            <h3 className="font-semibold">{subscriptionData.plan} Plan</h3>
            <p className="text-sm text-muted-foreground">
              Billed {subscriptionData.billing} • Next billing: {subscriptionData.nextBilling}
            </p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>

        {/* Seat Usage */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Seat Usage
            </h3>
            {isNearLimit && (
              <Badge variant="outline" className={isAtLimit ? "border-red-500 text-red-500" : "border-yellow-500 text-yellow-500"}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {isAtLimit ? "At Limit" : "Near Limit"}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{subscriptionData.usedSeats} of {subscriptionData.totalSeats} seats used</span>
              <span>{Math.round(usagePercentage)}%</span>
            </div>
            <Progress 
              value={usagePercentage} 
              className={`h-2 ${isAtLimit ? 'bg-red-100' : isNearLimit ? 'bg-yellow-100' : 'bg-green-100'}`}
            />
          </div>
        </div>

        {/* Seat Management */}
        <div className="space-y-4">
          <h3 className="font-semibold">Manage Seats</h3>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveSeat}
              disabled={subscriptionData.totalSeats <= subscriptionData.usedSeats}
            >
              <Minus className="h-4 w-4 mr-2" />
              Remove Seat
            </Button>
            <span className="text-sm text-muted-foreground">
              {subscriptionData.totalSeats} seats
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSeat}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Seat
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current cost: ${subscriptionData.cost.toFixed(2)} per month (${5} per seat)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1">
            View Billing History
          </Button>
          <Button variant="outline" className="flex-1">
            Change Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
