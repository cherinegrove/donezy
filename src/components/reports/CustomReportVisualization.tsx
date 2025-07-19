import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportConfig, ReportData } from "@/types/reportBuilder";

interface CustomReportVisualizationProps {
  config: ReportConfig;
  data: ReportData | null;
}

export function CustomReportVisualization({ config, data }: CustomReportVisualizationProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <p>Run the report to see results</p>
        </CardContent>
      </Card>
    );
  }

  const renderVisualization = () => {
    switch (config.reportType) {
      case 'number':
        return (
          <div className="text-center p-8">
            <div className="text-4xl font-bold text-primary mb-2">
              {data.formattedValue || data.value}
            </div>
            <div className="text-sm text-muted-foreground">
              {config.yAxisField ? `Total ${config.yAxisField}` : 'Total Count'}
            </div>
          </div>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data.datasets?.[0]?.data?.map((value: number, index: number) => ({
                  name: data.labels?.[index] || `Item ${index + 1}`,
                  value
                }))}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="hsl(var(--primary))"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.datasets?.[0]?.backgroundColor?.map((color: string, index: number) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'graph':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.labels?.map((label, index) => ({
              name: label,
              value: data.datasets?.[0]?.data[index] || 0
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'list':
        if (!data.rows?.length) {
          return <div className="text-center p-8 text-muted-foreground">No data to display</div>;
        }
        
        const columns = Object.keys(data.rows[0]);
        return (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map(column => (
                    <TableCell key={column}>{row[column]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return <div className="text-center p-8 text-muted-foreground">Unsupported report type</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {config.name || "Untitled Report"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderVisualization()}
      </CardContent>
    </Card>
  );
}