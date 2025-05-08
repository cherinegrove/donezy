
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface AddClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const currencyOptions = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "ZAR", label: "South African Rand (ZAR)" }
];

export function AddClientDialog({ isOpen, onClose }: AddClientDialogProps) {
  const { addClient } = useAppContext();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [billableRate, setBillableRate] = useState<number>(100);
  const [currency, setCurrency] = useState("USD");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new client object with required fields
    const newClient = {
      name,
      website,
      contactName,
      email,
      phone,
      billableRate,
      currency,
      projectIds: []
    };
    
    // Add client using context function
    addClient(newClient);
    
    // Show success toast
    toast({
      title: "Client Added",
      description: `${name} has been added successfully`,
      variant: "default"
    });
    
    // Reset form and close dialog
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setWebsite("");
    setContactName("");
    setEmail("");
    setPhone("");
    setBillableRate(100);
    setCurrency("USD");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Acme Inc." 
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Client Website *</Label>
              <Input 
                id="website" 
                value={website} 
                onChange={(e) => setWebsite(e.target.value)} 
                placeholder="https://www.acmeinc.com" 
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billableRate">Billable Rate *</Label>
                <Input 
                  id="billableRate" 
                  type="number" 
                  value={billableRate} 
                  onChange={(e) => setBillableRate(Number(e.target.value))} 
                  min="0"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input 
                id="contactName" 
                value={contactName} 
                onChange={(e) => setContactName(e.target.value)} 
                placeholder="John Doe"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="john.doe@acmeinc.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={() => {
              resetForm();
              onClose();
            }}>
              Cancel
            </Button>
            <Button type="submit">Create Client</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
