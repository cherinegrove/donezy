
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";

export default function ClientAgreements() {
  const { clients } = useAppContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Client Agreements</h1>
        <p className="text-muted-foreground">
          Manage agreements and contracts with your clients.
        </p>
      </div>

      <div className="grid gap-6">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardHeader>
              <CardTitle>{client.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div><strong>Contact:</strong> {client.contactName}</div>
                <div><strong>Email:</strong> {client.email}</div>
                <div><strong>Status:</strong> {client.status || 'Active'}</div>
                {client.serviceType && (
                  <div><strong>Service Type:</strong> {client.serviceType}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {clients.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No client agreements found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
