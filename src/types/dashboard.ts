export interface SavedReport {
  id: string;
  name: string;
  reportConfig: any; // This will match the ReportConfig from reportBuilder
  reportData: any;
  createdAt: string;
  updatedAt: string;
}

export interface CustomDashboard {
  id: string;
  name: string;
  description?: string;
  reportIds: string[];
  layout: DashboardLayout[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardLayout {
  reportId: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}