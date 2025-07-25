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
import { SaveReportDialog } from "../dashboard/SaveReportDialog";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

export function CustomReportBuilder() {
  const { customFields, users, projects, tasks, clients, notes, teams, timeEntries, purchases, customDashboards, saveReport } = useAppContext();
  const { toast } = useToast();
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
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

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
      // Generate real data based on config using context data
      const reportData = generateReportData(reportConfig, selectedDataSource);
      setReportData(reportData);
    } catch (error) {
      console.error("Error running report:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveReport = (reportName: string, dashboardId?: string) => {
    console.log("handleSaveReport called with:", { reportName, dashboardId, reportData: !!reportData, dataSource: reportConfig.dataSource });
    
    if (!reportData || !reportConfig.dataSource) {
      console.log("Missing reportData or dataSource");
      toast({
        title: "Cannot save report",
        description: "Please run the report first before saving.",
        variant: "destructive",
      });
      return;
    }

    // Auto-determine dashboard based on data source if not provided
    let targetDashboardId = dashboardId;
    if (!targetDashboardId) {
      const dashboardMap: Record<string, string> = {
        'projects': 'projects-dashboard',
        'tasks': 'tasks-dashboard',
        'time_entries': 'time-dashboard',
        'purchases': 'billing-dashboard'
      };
      targetDashboardId = dashboardMap[reportConfig.dataSource];
      console.log("Auto-determined dashboard:", targetDashboardId, "for data source:", reportConfig.dataSource);
    }

    if (!targetDashboardId) {
      console.log("No target dashboard found");
      toast({
        title: "Cannot save report",
        description: "Unable to determine target dashboard.",
        variant: "destructive",
      });
      return;
    }

    console.log("Calling saveReport with:", { reportName, targetDashboardId });
    console.log("Available dashboards:", customDashboards.map(d => ({ id: d.id, name: d.name })));
    
    try {
      saveReport({
        name: reportName,
        reportConfig,
        reportData,
      }, targetDashboardId);

      const dashboardName = customDashboards.find(d => d.id === targetDashboardId)?.name || 'dashboard';
      console.log("Report saved successfully to:", dashboardName);
      
      toast({
        title: "Report saved",
        description: `Report "${reportName}" has been saved to ${dashboardName}.`,
      });
      
      setIsSaveDialogOpen(false);
    } catch (error) {
      console.error("Error saving report:", error);
      toast({
        title: "Error saving report",
        description: "There was an error saving the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateReportData = (config: ReportConfig, dataSource: DataSource | undefined) => {
    if (!dataSource) return null;

    // Get the actual data from context based on the data source
    let sourceData: any[] = [];
    switch (config.dataSource) {
      case 'projects':
        sourceData = projects || [];
        break;
      case 'tasks':
        sourceData = tasks || [];
        break;
      case 'time_entries':
        sourceData = timeEntries || [];
        break;
      case 'purchases':
        sourceData = purchases || [];
        break;
      default:
        sourceData = [];
    }

    // Apply filters to the source data
    const filteredData = sourceData.filter(item => {
      return config.filters.every(filter => {
        if (!filter.fieldId || !filter.value) return true;
        
        const fieldValue = item[filter.fieldId];
        const filterValue = filter.value;
        
        switch (filter.operator) {
          case 'equals':
            return String(fieldValue).toLowerCase() === String(filterValue).toLowerCase();
          case 'not_equals':
            return String(fieldValue).toLowerCase() !== String(filterValue).toLowerCase();
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'greater_than':
            return Number(fieldValue) > Number(filterValue);
          case 'less_than':
            return Number(fieldValue) < Number(filterValue);
          default:
            return true;
        }
      });
    });

    console.log(`Report data for ${config.dataSource}: ${sourceData.length} total records, ${filteredData.length} after filtering`);

    // Use filtered data instead of sourceData for all calculations
    sourceData = filteredData;

    switch (config.reportType) {
      case 'number':
        if (config.aggregationType === 'count') {
          return {
            value: sourceData.length,
            formattedValue: sourceData.length.toLocaleString()
          };
        } else if (config.yAxisField && config.aggregationType) {
          const values = sourceData
            .map(item => {
              const value = item[config.yAxisField!];
              return typeof value === 'number' ? value : 0;
            })
            .filter(v => !isNaN(v));
          
          let result = 0;
          switch (config.aggregationType) {
            case 'sum':
              result = values.reduce((sum, val) => sum + val, 0);
              break;
            case 'average':
              result = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
              break;
            case 'min':
              result = values.length > 0 ? Math.min(...values) : 0;
              break;
            case 'max':
              result = values.length > 0 ? Math.max(...values) : 0;
              break;
            default:
              result = values.length;
          }
          return {
            value: result,
            formattedValue: result.toLocaleString()
          };
        }
        return {
          value: sourceData.length,
          formattedValue: sourceData.length.toLocaleString()
        };

      case 'pie':
        if (config.groupByField) {
          const groupCounts: Record<string, number> = {};
          sourceData.forEach(item => {
            const groupValue = item[config.groupByField!] || 'Unknown';
            groupCounts[groupValue] = (groupCounts[groupValue] || 0) + 1;
          });
          
          const labels = Object.keys(groupCounts);
          const data = Object.values(groupCounts);
          
          return {
            labels,
            datasets: [{
              data,
              backgroundColor: labels.map((_, i) => `hsl(${(i * 137.5) % 360}, 70%, 50%)`)
            }]
          };
        }
        return {
          labels: ['Total'],
          datasets: [{
            data: [sourceData.length],
            backgroundColor: ['hsl(var(--primary))']
          }]
        };

      case 'graph':
        if (config.groupByField) {
          const groupCounts: Record<string, number> = {};
          sourceData.forEach(item => {
            const groupValue = item[config.groupByField!] || 'Unknown';
            groupCounts[groupValue] = (groupCounts[groupValue] || 0) + 1;
          });
          
          const labels = Object.keys(groupCounts);
          const data = Object.values(groupCounts);
          
          return {
            labels,
            datasets: [{
              label: config.yAxisField || 'Count',
              data,
              borderColor: 'hsl(var(--primary))',
              backgroundColor: 'hsl(var(--primary) / 0.1)'
            }]
          };
        }
        return {
          labels: [config.dataSource],
          datasets: [{
            label: 'Count',
            data: [sourceData.length],
            borderColor: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--primary) / 0.1)'
          }]
        };

      case 'list':
        const displayFields = config.selectedFields.length > 0 ? config.selectedFields : ['id', 'name'];
        const rows = sourceData.slice(0, 100).map(item => {
          const row: any = {};
          displayFields.forEach(fieldId => {
            const field = dataSource.fields.find(f => f.id === fieldId);
            if (field) {
              row[field.name] = item[fieldId] || '';
            }
          });
          return row;
        });
        
        return { rows };

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
            <Button 
              variant="outline" 
              disabled={!reportData}
              onClick={() => {
                const reportName = reportConfig.name || `${selectedDataSource?.name} Report`;
                handleSaveReport(reportName);
              }}
            >
              <Save className="h-4 w-4 mr-1" />
              Auto-Save Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Panel */}
      <div className="space-y-4">
        <CustomReportVisualization config={reportConfig} data={reportData} />
      </div>

      {/* Save Report Dialog */}
      <SaveReportDialog
        open={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        onSaveReport={handleSaveReport}
        dashboards={customDashboards}
        defaultReportName={reportConfig.name}
      />
    </div>
  );
}