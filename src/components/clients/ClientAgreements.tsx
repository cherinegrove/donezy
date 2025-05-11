
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ClientAgreement } from "@/types";
import { Badge } from "@/components/ui/badge";
import { AddAgreementDialog } from "./AddAgreementDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ClientAgreementsProps {
  clientId: string;
}

export const ClientAgreements = ({ clientId }: ClientAgreementsProps) => {
  const { getClientAgreements, getClientById } = useAppContext();
  const [isAddAgreementDialogOpen, setIsAddAgreementDialogOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<ClientAgreement | null>(null);
  
  const client = getClientById(clientId);
  const agreements = getClientAgreements(clientId);
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency 
    }).format(amount);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  const getServiceTypeLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'retainer':
        return 'Retainer';
      case 'payasyougo':
        return 'Pay As You Go';
      case 'bank-hours':
        return 'Bank of Hours';
      default:
        return serviceType;
    }
  };

  if (!client) {
    return <div>Client not found</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Billing Agreements</CardTitle>
            <CardDescription>
              Track and manage client billing agreements
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddAgreementDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> 
            New Agreement
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {agreements.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {agreements.map((agreement) => (
                <div 
                  key={agreement.id}
                  className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedAgreement(agreement);
                    setIsAddAgreementDialogOpen(true);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">{agreement.description}</h3>
                    </div>
                    <Badge className={getStatusColor(agreement.status)}>
                      {agreement.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Rate:</span>
                      <span className="font-medium">
                        {formatCurrency(agreement.rate, agreement.currency)}/hr
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Start:</span>
                      <span className="font-medium">
                        {format(new Date(agreement.startDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm capitalize">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">
                        {getServiceTypeLabel(agreement.serviceType)}
                      </span>
                    </div>
                    
                    {agreement.endDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">End:</span>
                        <span className="font-medium">
                          {format(new Date(agreement.endDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    
                    {(agreement.serviceType === 'retainer' || agreement.serviceType === 'bank-hours') && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Allocated:</span>
                          <span className="font-medium">
                            {agreement.allocatedHours} hrs
                          </span>
                        </div>
                        
                        {agreement.usedHours !== undefined && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Used:</span>
                            <span className="font-medium">
                              {agreement.usedHours} hrs
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h3 className="text-lg font-medium mb-1">No Agreements</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Create a billing agreement to track contracts, retainers, or banks of hours for this client.
            </p>
            <Button onClick={() => setIsAddAgreementDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add First Agreement
            </Button>
          </div>
        )}
      </CardContent>
      
      <AddAgreementDialog 
        clientId={clientId}
        isOpen={isAddAgreementDialogOpen}
        onClose={() => {
          setIsAddAgreementDialogOpen(false);
          setSelectedAgreement(null);
        }}
        existingAgreement={selectedAgreement}
      />
    </Card>
  );
};
