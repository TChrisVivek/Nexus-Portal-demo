import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "cyan" | "purple" | "success" | "warning";
  className?: string;
}

const variantStyles = {
  cyan: {
    accent: "bg-accent-cyan",
    iconBg: "bg-blue-50",
    iconBorder: "border-blue-100",
    iconColor: "text-blue-600",
    valueColor: "text-blue-700",
    glow: "hover:shadow-cyan-glow",
  },
  purple: {
    accent: "bg-accent-purple",
    iconBg: "bg-violet-50",
    iconBorder: "border-violet-100",
    iconColor: "text-violet-600",
    valueColor: "text-violet-700",
    glow: "hover:shadow-purple-glow",
  },
  success: {
    accent: "bg-accent-success",
    iconBg: "bg-emerald-50",
    iconBorder: "border-emerald-100",
    iconColor: "text-emerald-600",
    valueColor: "text-emerald-700",
    glow: "hover:shadow-[0_0_0_3px_rgba(16,185,129,0.12),0_4px_16px_rgba(16,185,129,0.12)]",
  },
  warning: {
    accent: "bg-accent-warning",
    iconBg: "bg-amber-50",
    iconBorder: "border-amber-100",
    iconColor: "text-amber-600",
    valueColor: "text-amber-700",
    glow: "hover:shadow-[0_0_0_3px_rgba(245,158,11,0.12),0_4px_16px_rgba(245,158,11,0.12)]",
  },
};

export function MetricCard({
  title, value, subtitle, icon: Icon, trend, variant = "cyan", className,
}: MetricCardProps) {
  const S = variantStyles[variant];
  const isPositive = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        "relative bg-white rounded-2xl p-5 overflow-hidden border border-gray-200 animate-fade-in transition-all duration-200 cursor-default",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]",
        S.glow,
        className
      )}
    >
      {/* Left accent bar */}
      <div className={cn("metric-accent-bar", S.accent)} />

      {/* Content */}
      <div className="flex items-start justify-between mb-4 pl-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            {title}
          </p>
          <p className={cn("text-3xl font-bold leading-none tabular-nums tracking-tight", S.valueColor)}>
            {value}
          </p>
        </div>
        <div className={cn(
          "flex-shrink-0 p-2.5 rounded-xl border",
          S.iconBg, S.iconBorder
        )}>
          <Icon size={20} className={S.iconColor} strokeWidth={1.8} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2 pl-3">
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold ml-auto flex-shrink-0",
            isPositive ? "text-emerald-600" : "text-red-600"
          )}>
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span>{isPositive ? "+" : ""}{trend.value}%</span>
            <span className="text-gray-400 font-normal ml-0.5">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
