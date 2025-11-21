import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface AnalyticsCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  value?: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  children?: ReactNode;
  iconColor?: string;
  className?: string;
}

export function AnalyticsCard({ 
  title, 
  description, 
  icon: Icon, 
  value, 
  trend,
  children,
  iconColor = "hsl(var(--primary))",
  className = ""
}: AnalyticsCardProps) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${iconColor}15` }}
            >
              <Icon className="h-5 w-5" style={{ color: iconColor }} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              {description && (
                <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
              )}
            </div>
          </div>
          {trend && (
            <div className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </CardHeader>
      {(value || children) && (
        <CardContent>
          {value && (
            <div className="text-3xl font-bold" style={{ color: iconColor }}>
              {value}
            </div>
          )}
          {children}
        </CardContent>
      )}
    </Card>
  );
}
