
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { ClientAgreement } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileMinus, FilePlus, FileClock } from "lucide-react";
import { format } from "date-fns";

interface AddAgreementDialogProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  existingAgreement?: ClientAgreement | null;
}

// Define the valid service types as a type
type ServiceType = 'retainer' | 'payasyougo' | 'bank-hours';

const currencyOptions = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "ZAR", label: "South African Rand", symbol: "R" },
  { value: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { value: "JPY", label: "Japanese Yen", symbol: "¥" }
];

export const AddAgreementDialog = ({ 
  clientId, 
  isOpen, 
  onClose,
  existingAgreement 
}: AddAgreementDialogProps) => {
  const { addClientAgreement, updateClientAgreement, getClientById } = useAppContext();
  const { toast } = useToast();
  const client = getClientById(clientId);
  
  const [description, setDescription] = useState(existingAgreement?.description || "");
  const [serviceType, setServiceType] = useState<ServiceType>(
    (existingAgreement?.serviceType as ServiceType) || "payasyougo"
  );
  const [rate, setRate] = useState(existingAgreement?.rate || client?.billableRate || 0);
  const [currency, setCurrency] = useState(existingAgreement?.currency || client?.currency || "USD");
  const [allocatedHours, setAllocatedHours] = useState(existingAgreement?.allocatedHours || 0);
  const [startDate, setStartDate] = useState(
    existingAgreement?.startDate || format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(existingAgreement?.endDate || "");
  const [status, setStatus] = useState<"active" | "completed" | "cancelled">(
    existingAgreement?.status || "active"
  );
  
  // Reset form when dialog opens/closes or when existing agreement changes
  useEffect(() => {
    if (existingAgreement) {
      setDescription(existingAgreement.description);
      setServiceType(existingAgreement.serviceType as ServiceType);
      setRate(existingAgreement.rate);
      setCurrency(existingAgreement.currency);
      setAllocatedHours(existingAgreement.allocatedHours || 0);
      setStartDate(existingAgreement.startDate);
      setEndDate(existingAgreement.endDate || "");
      setStatus(existingAgreement.status);
    } else {
      setDescription("");
      setServiceType("payasyougo");
      setRate(client?.billableRate || 0);
      setCurrency(client?.currency || "USD");
      setAllocatedHours(0);
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setEndDate("");
      setStatus("active");
    }
  }, [isOpen, existingAgreement, client]);
  
  const handleSubmit = () => {
    if (!description) {
      toast({
        title: "Missing information",
        description: "Please provide a description for the agreement",
        variant: "destructive"
      });
      return;
    }
    
    if (rate <= 0) {
      toast({
        title: "Invalid rate",
        description: "Please enter a valid hourly rate",
        variant: "destructive"
      });
      return;
    }
    
    if ((serviceType === 'retainer' || serviceType === 'bank-hours') && allocatedHours <= 0) {
      toast({
        title: "Invalid hours",
        description: "Please enter valid allocated hours",
        variant: "destructive"
      });
      return;
    }
    
    const agreementData = {
      clientId,
      description,
      serviceType,
      rate,
      currency,
      allocatedHours: (serviceType === 'retainer' || serviceType === 'bank-hours') ? allocatedHours : undefined,
      usedHours: existingAgreement?.usedHours || 0,
      startDate,
      endDate: endDate || undefined,
      status
    };
    
    if (existingAgreement) {
      updateClientAgreement(existingAgreement.id, agreementData);
      toast({
        title: "Agreement updated",
        description: "The client agreement has been updated"
      });
    } else {
      addClientAgreement(agreementData);
      toast({
        title: "Agreement created",
        description: "A new client agreement has been created"
      });
    }
    
    onClose();
  };
  
  // Create a handler that explicitly casts the value to ServiceType
  const handleServiceTypeChange = (value: string) => {
    setServiceType(value as ServiceType);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {existingAgreement ? "Edit Agreement" : "New Billing Agreement"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Agreement Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Monthly Retainer - Q1 2025"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Agreement Type</Label>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date (Optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          {existingAgreement && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: "active" | "completed" | "cancelled") => setStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {existingAgreement ? "Save Changes" : "Create Agreement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
