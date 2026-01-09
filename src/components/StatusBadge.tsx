import { cn } from "@/lib/utils";

type Status = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "status-pending" },
  RUNNING: { label: "Running", className: "status-running" },
  COMPLETED: { label: "Completed", className: "status-completed" },
  FAILED: { label: "Failed", className: "status-failed" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING;
  
  return (
    <span className={cn("status-badge", config.className, className)}>
      {config.label}
    </span>
  );
}
