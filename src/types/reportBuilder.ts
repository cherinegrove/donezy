export interface ReportField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'array';
  source: DataSource;
  isCustomField?: boolean;
}

export interface DataSource {
  id: string;
  name: string;
  table: string;
  fields: ReportField[];
}

export interface ReportFilter {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
}

export interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  dataSource: string;
  reportType: 'graph' | 'list' | 'pie' | 'number';
  xAxisField?: string;
  yAxisField?: string;
  groupByField?: string;
  aggregationType?: 'count' | 'sum' | 'average' | 'min' | 'max';
  filters: ReportFilter[];
  selectedFields: string[];
}

export interface ReportData {
  labels?: string[];
  datasets?: any[];
  rows?: any[];
  value?: number;
  formattedValue?: string;
}