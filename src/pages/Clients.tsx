
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Client } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddClientDialog } from "@/components/clients/AddClientDialog";

export default function Clients() {
  const { clients } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filteredClients = clients.filter((client) => {
    const searchRegex = new RegExp(searchTerm, "i");
    const nameMatch = searchRegex.test(client.name);
    const emailMatch = searchRegex.test(client.email);

    let statusMatch = true;
    if (statusFilter !== "all") {
      statusMatch = client.status === statusFilter;
    }

    return (nameMatch || emailMatch) && statusMatch;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Button onClick={() => setAddDialogOpen(true)}>Add Client</Button>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <Input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Select onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableCaption>A list of your clients.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <Link to={`/clients/${client.id}`} className="hover:underline">
                  {client.name}
                </Link>
              </TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>{client.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <AddClientDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen} 
      />
    </div>
  );
}
