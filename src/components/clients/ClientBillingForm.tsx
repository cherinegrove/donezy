
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, FileMinus, FilePlus, FileClock } from "lucide-react";

interface ClientBillingFormProps {
  clientId: string;
}

const currencyOptions = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "ZAR", label: "South African Rand", symbol: "R" },
  { value: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { value: "JPY", label: "Japanese Yen", symbol: "¥" }
];

// Define the valid service types as a type
type ServiceType = 'retainer' | 'payasyougo' | 'bank-hours';

export const ClientBillingForm = ({ clientId }: ClientBillingFormProps) => {
  const { getClientById, updateClient } = useAppContext();
  const client = getClientById(clientId);
  const { toast } = useToast();
  
  const [billableRate, setBillableRate] = useState(client?.billableRate || 0);
  const [currency, setCurrency] = useState(client?.currency || "USD");
  const [serviceType, setServiceType] = useState<ServiceType>(client?.serviceType as ServiceType || "payasyougo");
  const [allocatedHours, setAllocatedHours] = useState(client?.allocatedHours || 0);
  
  const handleSave = () => {
    if (client) {
      updateClient(clientId, {
        billableRate,
        currency,
        serviceType,
        allocatedHours: (serviceType === "retainer" || serviceType === "bank-hours") 
          ? allocatedHours 
          : undefined
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
  
  // Create a handler that explicitly casts the value to ServiceType
  const handleServiceTypeChange = (value: string) => {
    setServiceType(value as ServiceType);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Settings</CardTitle>
        <CardDescription>
          Configure billing rate and currency for {client.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billable-rate">Billable Rate (per hour)</Label>
              <Input
                id="billable-rate"
                type="number"
                min="0"
                step="0.01"
                value={billableRate}
                onChange={(e) => setBillableRate(parseFloat(e.target.value) || 0)}
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
          
          <div className="space-y-2">
            <Label>Client Type</Label>
            <RadioGroup
              value={serviceType}
              onValueChange={handleServiceTypeChange}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
            >
              <div className={`flex items-start space-x-2 p-3 rounded-md border ${serviceType === "retainer" ? "border-primary bg-primary/5" : ""}`}>
                <RadioGroupItem value="retainer" id="retainer" className="mt-1" />
                <Label htmlFor="retainer" className="flex-1 cursor-pointer space-y-2">
                  <div className="flex items-center">
                    <FileMinus className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">Retainer</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Monthly recurring hours and billing
                  </p>
                </Label>
              </div>
              
              <div className={`flex items-start space-x-2 p-3 rounded-md border ${serviceType === "payasyougo" ? "border-primary bg-primary/5" : ""}`}>
                <RadioGroupItem value="payasyougo" id="payasyougo" className="mt-1" />
                <Label htmlFor="payasyougo" className="flex-1 cursor-pointer space-y-2">
                  <div className="flex items-center">
                    <FilePlus className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">Pay As You Go</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bill only for used hours
                  </p>
                </Label>
              </div>
              
              <div className={`flex items-start space-x-2 p-3 rounded-md border ${serviceType === "bank-hours" ? "border-primary bg-primary/5" : ""}`}>
                <RadioGroupItem value="bank-hours" id="bank-hours" className="mt-1" />
                <Label htmlFor="bank-hours" className="flex-1 cursor-pointer space-y-2">
                  <div className="flex items-center">
                    <FileClock className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">Bank of Hours</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Buy hours in advance and use as needed
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {(serviceType === "retainer" || serviceType === "bank-hours") && (
            <div className="space-y-2">
              <Label htmlFor="allocated-hours">
                {serviceType === "retainer" ? "Monthly Hours" : "Allocated Hours"}
              </Label>
              <Input
                id="allocated-hours"
                type="number"
                min="0"
                step="1"
                value={allocatedHours}
                onChange={(e) => setAllocatedHours(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                {serviceType === "retainer" 
                  ? "Number of hours allocated per month" 
                  : "Number of hours pre-purchased in the bank"}
              </p>
            </div>
          )}
          
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave}>Save Billing Settings</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
