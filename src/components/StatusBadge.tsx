import { DonationStatus, STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: DonationStatus }) {
  return (
    <span className={cn("status-pill", `status-${status}`)}>
      {STATUS_LABELS[status]}
    </span>
  );
}
