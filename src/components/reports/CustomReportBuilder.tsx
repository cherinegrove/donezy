import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Play, Save } from "lucide-react";
import { ReportConfig, ReportFilter, DataSource } from "@/types/reportBuilder";
import { useReportDataSources } from "@/hooks/useReportDataSources";
import { CustomReportVisualization } from "./CustomReportVisualization";
import { useAppContext } from "@/contexts/AppContext";

export function CustomReportBuilder() {
  const { customFields } = useAppContext();
  const dataSources = useReportDataSources(customFields);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: "",
    dataSource: "",
    reportType: "graph",
    filters: [],
    selectedFields: [],
  });
  const [reportData, setReportData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const selectedDataSource = dataSources.find(ds => ds.id === reportConfig.dataSource);

  const addFilter = () => {
    const newFilter: ReportFilter = {
      id: Math.random().toString(36).substr(2, 9),
      fieldId: "",
      operator: "equals",
      value: ""
    };
    setReportConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.map(filter => 
        filter.id === filterId ? { ...filter, ...updates } : filter
      )
    }));
  };

  const removeFilter = (filterId: string) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(filter => filter.id !== filterId)
    }));
  };

  const runReport = async () => {
    if (!reportConfig.dataSource) return;
    
    setIsRunning(true);
    try {
      // This would integrate with your data fetching logic
      // For now, we'll simulate the report generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock data based on config
      const mockData = generateMockReportData(reportConfig, selectedDataSource);
      setReportData(mockData);
    } catch (error) {
      console.error("Error running report:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const generateMockReportData = (config: ReportConfig, dataSource: DataSource | undefined) => {
    if (!dataSource) return null;

    switch (config.reportType) {
      case 'number':
        return {
          value: Math.floor(Math.random() * 1000),
          formattedValue: Math.floor(Math.random() * 1000).toLocaleString()
        };
      case 'pie':
        return {
          labels: ['Active', 'Completed', 'On Hold'],
          datasets: [{
            data: [30, 50, 20],
            backgroundColor: ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--muted))']
          }]
        };
      case 'graph':
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [{
            label: config.yAxisField || 'Value',
            data: [12, 19, 8, 15, 22],
            borderColor: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--primary) / 0.1)'
          }]
        };
      case 'list':
        return {
          rows: [
            { id: 1, name: 'Item 1', status: 'Active', count: 5 },
            { id: 2, name: 'Item 2', status: 'Completed', count: 8 },
            { id: 3, name: 'Item 3', status: 'On Hold', count: 2 }
          ]
        };
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Configuration */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="reportName">Report Name</Label>
              <Input
                id="reportName"
                value={reportConfig.name}
                onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter report name"
              />
            </div>
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                value={reportConfig.reportType}
                onValueChange={(value: any) => setReportConfig(prev => ({ ...prev, reportType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="graph">Graph (X/Y Axis)</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="number">Number/Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Source Selection */}
          <div>
            <Label htmlFor="dataSource">Data Source</Label>
            <Select
              value={reportConfig.dataSource}
              onValueChange={(value) => setReportConfig(prev => ({ ...prev, dataSource: value, selectedFields: [] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                {dataSources.map(source => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field Configuration */}
          {selectedDataSource && (
            <div className="space-y-4">
              {reportConfig.reportType === 'graph' && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="xAxis">X-Axis Field (Category)</Label>
                    <Select
                      value={reportConfig.xAxisField || ""}
                      onValueChange={(value) => setReportConfig(prev => ({ ...prev, xAxisField: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDataSource.fields.filter(f => f.type === 'text').map(field => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name} {field.isCustomField && <Badge variant="secondary" className="ml-1">Custom</Badge>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="yAxis">Y-Axis Field (Value)</Label>
                    <Select
                      value={reportConfig.yAxisField || ""}
                      onValueChange={(value) => setReportConfig(prev => ({ ...prev, yAxisField: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDataSource.fields.filter(f => f.type === 'number').map(field => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name} {field.isCustomField && <Badge variant="secondary" className="ml-1">Custom</Badge>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="aggregation">Aggregation</Label>
                    <Select
                      value={reportConfig.aggregationType || "count"}
                      onValueChange={(value: any) => setReportConfig(prev => ({ ...prev, aggregationType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {reportConfig.reportType === 'pie' && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="groupBy">Group By Field</Label>
                    <Select
                      value={reportConfig.groupByField || ""}
                      onValueChange={(value) => setReportConfig(prev => ({ ...prev, groupByField: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDataSource.fields.filter(f => f.type === 'text').map(field => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name} {field.isCustomField && <Badge variant="secondary" className="ml-1">Custom</Badge>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="aggregation">Aggregation</Label>
                    <Select
                      value={reportConfig.aggregationType || "count"}
                      onValueChange={(value: any) => setReportConfig(prev => ({ ...prev, aggregationType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {reportConfig.reportType === 'number' && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="valueField">Value Field</Label>
                    <Select
                      value={reportConfig.yAxisField || ""}
                      onValueChange={(value) => setReportConfig(prev => ({ ...prev, yAxisField: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDataSource.fields.map(field => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name} {field.isCustomField && <Badge variant="secondary" className="ml-1">Custom</Badge>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="aggregation">Aggregation</Label>
                    <Select
                      value={reportConfig.aggregationType || "count"}
                      onValueChange={(value: any) => setReportConfig(prev => ({ ...prev, aggregationType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {reportConfig.reportType === 'list' && (
                <div>
                  <Label>Select Fields to Display</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                    {selectedDataSource.fields.map(field => (
                      <label key={field.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={reportConfig.selectedFields.includes(field.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReportConfig(prev => ({
                                ...prev,
                                selectedFields: [...prev.selectedFields, field.id]
                              }));
                            } else {
                              setReportConfig(prev => ({
                                ...prev,
                                selectedFields: prev.selectedFields.filter(id => id !== field.id)
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{field.name}</span>
                        {field.isCustomField && <Badge variant="secondary" className="text-xs">Custom</Badge>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Filters</Label>
              <Button onClick={addFilter} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Filter
              </Button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {reportConfig.filters.map(filter => (
                <div key={filter.id} className="flex items-center space-x-2 p-2 border rounded-lg">
                  <Select
                    value={filter.fieldId}
                    onValueChange={(value) => updateFilter(filter.id, { fieldId: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDataSource?.fields.map(field => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={filter.operator}
                    onValueChange={(value: any) => updateFilter(filter.id, { operator: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not_equals">Not Equals</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="greater_than">Greater Than</SelectItem>
                      <SelectItem value="less_than">Less Than</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    placeholder="Value"
                    className="flex-1"
                  />
                  
                  <Button
                    onClick={() => removeFilter(filter.id)}
                    variant="outline"
                    size="icon"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button onClick={runReport} disabled={!reportConfig.dataSource || isRunning}>
              <Play className="h-4 w-4 mr-1" />
              {isRunning ? "Running..." : "Run Report"}
            </Button>
            <Button variant="outline" disabled={!reportConfig.name}>
              <Save className="h-4 w-4 mr-1" />
              Save Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Panel */}
      <div className="space-y-4">
        <CustomReportVisualization config={reportConfig} data={reportData} />
      </div>
    </div>
  );
}