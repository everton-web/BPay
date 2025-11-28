import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import type { ChargeStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: ChargeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    paid: {
      label: "Pago",
      icon: CheckCircle,
      className: "bg-success/10 text-success border-success/20",
    },
    pending: {
      label: "Em Aberto",
      icon: Clock,
      className: "bg-warning/10 text-warning border-warning/20",
    },
    overdue: {
      label: "Atrasado",
      icon: AlertCircle,
      className: "bg-danger/10 text-danger border-danger/20",
    },
    cancelled: {
      label: "Cancelado",
      icon: XCircle,
      className: "bg-muted text-muted-foreground border-muted",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={className} data-testid={`badge-status-${status}`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
