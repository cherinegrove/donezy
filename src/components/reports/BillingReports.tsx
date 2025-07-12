import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { ReportTile } from "./ReportTile";

import { TimeEntry, Client, Purchase } from "@/types";

interface BillingReportsProps {
  timeEntries: TimeEntry[];
  clients: Client[];
  purchases: Purchase[];
}

export function BillingReports({ timeEntries, clients, purchases }: BillingReportsProps) {
  // Client revenue calculation
  const clientRevenue = clients.map(client => {
    const clientTimeEntries = timeEntries.filter(entry => entry.clientId === client.id);
    const billableTime = clientTimeEntries.filter(entry => entry.status === 'approved' || entry.status === 'approved-billable').reduce((sum, entry) => sum + entry.duration, 0) / 60;
    const revenue = billableTime * 100; // Default rate of $100/hour
    
    return {
      name: client.name,
      revenue,
      hours: billableTime
    };
  }).filter(item => item.revenue > 0);

  // Billing status distribution
  const billingStatusData = [
    { 
      name: "Approved", 
      value: timeEntries.filter(entry => entry.status === 'approved' || entry.status === 'approved-billable').length, 
      color: "#82ca9d" 
    },
    { 
      name: "Pending", 
      value: timeEntries.filter(entry => entry.status === 'pending').length, 
      color: "#ffc658" 
    },
    { 
      name: "Rejected", 
      value: timeEntries.filter(entry => entry.status === 'rejected' || entry.status === 'declined').length, 
      color: "#ff7300" 
    }
  ];

  // Purchase categories
  const purchasesByCategory = purchases.reduce((acc, purchase) => {
    const category = purchase.category || 'Uncategorized';
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.amount += purchase.amount;
      existing.count += 1;
    } else {
      acc.push({
        name: category,
        amount: purchase.amount,
        count: 1
      });
    }
    return acc;
  }, [] as { name: string; amount: number; count: number }[]);

  // Monthly billing trends
  const monthlyBilling = (() => {
    const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};
    
    // Add revenue from time entries
    timeEntries.filter(entry => entry.status === 'approved' || entry.status === 'approved-billable').forEach(entry => {
      const month = new Date(entry.startTime).toISOString().slice(0, 7);
      const revenue = (entry.duration / 60) * 100;
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0 };
      }
      monthlyData[month].revenue += revenue;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        revenue: data.revenue,
        expenses: data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ReportTile title="Client Revenue">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={clientRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Billing Status Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={billingStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {billingStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Purchases by Category">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={purchasesByCategory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']} />
            <Bar dataKey="amount" fill="#ff7300" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>

      <ReportTile title="Monthly Revenue Trends">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyBilling}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </ReportTile>
    </div>
  );
}