// Placeholder component for legacy report visualization
// This component maintains compatibility with existing dashboard functionality

interface CustomReportVisualizationProps {
  config: any;
  data: any;
}

export const CustomReportVisualization = ({ config, data }: CustomReportVisualizationProps) => {
  return (
    <div className="p-4 text-center text-muted-foreground">
      <p className="text-sm">
        Legacy report visualization - Please use the new Analytics dashboard
      </p>
    </div>
  );
};
