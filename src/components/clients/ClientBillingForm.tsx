
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ClientBillingFormProps {
  clientId: string;
}

const currencyOptions = [
  { label: "US Dollar", value: "USD", symbol: "$" },
  { label: "Euro", value: "EUR", symbol: "€" },
  { label: "British Pound", value: "GBP", symbol: "£" },
  { label: "Canadian Dollar", value: "CAD", symbol: "C$" },
  { label: "Australian Dollar", value: "AUD", symbol: "A$" },
  { label: "Japanese Yen", value: "JPY", symbol: "¥" }
];

export const ClientBillingForm = ({ clientId }: ClientBillingFormProps) => {
  const { getClientById, updateClient } = useAppContext();
  const client = getClientById(clientId);
  const { toast } = useToast();
  
  const [billableRate, setBillableRate] = useState(client?.billableRate || 0);
  const [currency, setCurrency] = useState(client?.currency || "USD");
  
  const handleSave = () => {
    if (client) {
      updateClient(clientId, {
        billableRate,
        currency
      });
      
      toast({
        title: "Billing Settings Updated",
        description: "Client billing information has been saved"
      });
    }
  };
  
  if (!client) {
    return <div>Client not found</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Settings</CardTitle>
        <CardDescription>
          Configure billing rate and currency for {client.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billable-rate">Billable Rate (per hour)</Label>
              <Input
                id="billable-rate"
                type="number"
                min="0"
                step="0.01"
                value={billableRate}
                onChange={(e) => setBillableRate(parseFloat(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.symbol} {option.label} ({option.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave}>Save Billing Settings</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
