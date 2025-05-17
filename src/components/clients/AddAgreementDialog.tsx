
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddAgreementDialogProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedFiles?: string[];
}

export function AddAgreementDialog({ clientId, isOpen, onClose, selectedFiles = [] }: AddAgreementDialogProps) {
  const { addClientAgreement, getClientById } = useAppContext();
  const { toast } = useToast();
  const client = getClientById(clientId);
  
  // Form state
  const [serviceType, setServiceType] = useState<'retainer' | 'payasyougo' | 'bank-hours'>('retainer');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [allocatedHours, setAllocatedHours] = useState<number | undefined>(
    serviceType === 'payasyougo' ? undefined : 40
  );
  const [rate, setRate] = useState<number>(client?.billableRate || 100);
  const [currency, setCurrency] = useState<string>(client?.currency || 'USD');
  const [description, setDescription] = useState<string>('');
  
  // Handle service type change
  const handleServiceTypeChange = (value: 'retainer' | 'payasyougo' | 'bank-hours') => {
    setServiceType(value);
    if (value === 'payasyougo') {
      setAllocatedHours(undefined);
    } else if (!allocatedHours) {
      setAllocatedHours(40);
    }
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (!startDate) {
      toast({
        title: "Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }
    
    addClientAgreement({
      clientId,
      serviceType,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      allocatedHours,
      rate,
      currency,
      description,
      status: 'active',
      // Also include the selected files if needed in your data model
      // fileIds: selectedFiles
    });
    
    toast({
      title: "Agreement Added",
      description: "The client agreement has been added successfully",
    });
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Agreement</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select 
              value={serviceType} 
              onValueChange={(value: 'retainer' | 'payasyougo' | 'bank-hours') => handleServiceTypeChange(value)}
            >
              <SelectTrigger id="serviceType">
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retainer">Monthly Retainer</SelectItem>
                <SelectItem value="bank-hours">Bank of Hours</SelectItem>
                <SelectItem value="payasyougo">Pay As You Go</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {serviceType !== 'payasyougo' && (
            <div className="space-y-2">
              <Label htmlFor="allocatedHours">Allocated Hours</Label>
              <Input
                id="allocatedHours"
                type="number"
                value={allocatedHours?.toString() || ''}
                onChange={(e) => setAllocatedHours(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Rate</Label>
              <Input
                id="rate"
                type="number"
                value={rate.toString()}
                onChange={(e) => setRate(e.target.value ? parseFloat(e.target.value) : 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedFiles && selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files</Label>
              <div className="p-2 border rounded-md bg-muted/10">
                <p className="text-sm">{selectedFiles.length} file(s) selected</p>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter agreement details..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Agreement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
