import { Badge } from "@/components/ui/badge";
import { GF_STATUS_LABEL } from "@/lib/recipe-utils";
import type { GFStatus } from "@/types/recipe";
import { cn } from "@/lib/utils";

export function GfBadge({ status, className }: { status: GFStatus; className?: string }) {
  const colors: Record<GFStatus, string> = {
    CONFIRMED_GF: "bg-green-100 text-green-800 border-green-200",
    CONTAINS_GLUTEN: "bg-red-100 text-red-800 border-red-200",
    NEEDS_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-semibold px-1.5 py-0", colors[status], className)}
    >
      {GF_STATUS_LABEL[status]}
    </Badge>
  );
}
