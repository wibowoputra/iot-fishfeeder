import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  status?: "success" | "danger" | "warning" | "neutral";
  className?: string;
  subtext?: string;
}

export function StatusCard({ title, value, icon, status = "neutral", className, subtext }: StatusCardProps) {
  const statusStyles = {
    success: "bg-green-50 text-green-700 border-green-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    neutral: "bg-white text-foreground border-border",
  };

  const iconStyles = {
    success: "bg-green-100 text-green-600",
    danger: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-600",
    neutral: "bg-primary/10 text-primary",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md",
      statusStyles[status],
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <h3 className="mt-2 text-2xl font-bold font-display tracking-tight">{value}</h3>
          {subtext && <p className="mt-1 text-xs opacity-70">{subtext}</p>}
        </div>
        <div className={cn("rounded-xl p-3 shadow-inner", iconStyles[status])}>
          {icon}
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-current opacity-[0.03] pointer-events-none" />
    </div>
  );
}
