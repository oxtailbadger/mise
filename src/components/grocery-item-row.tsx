"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { GroceryItemClient } from "@/types/grocery";

interface GroceryItemRowProps {
  item: GroceryItemClient;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}

export function GroceryItemRow({ item, onToggle, onDelete }: GroceryItemRowProps) {
  const quantityLabel = [item.quantity, item.unit].filter(Boolean).join(" ");

  return (
    <div className={cn(
      "flex items-center gap-3 py-2.5 px-1 group",
      item.isChecked && "opacity-50"
    )}>
      <Checkbox
        id={item.id}
        checked={item.isChecked}
        onCheckedChange={(checked) => onToggle(item.id, !!checked)}
        className="shrink-0"
      />
      <label
        htmlFor={item.id}
        className={cn(
          "flex-1 text-sm cursor-pointer select-none",
          item.isChecked && "line-through text-muted-foreground"
        )}
      >
        <span className="font-medium">{item.name}</span>
        {quantityLabel && (
          <span className="text-muted-foreground ml-1.5 font-normal">{quantityLabel}</span>
        )}
        {item.isManual && (
          <span className="text-muted-foreground ml-1.5 text-xs italic">manual</span>
        )}
      </label>
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all shrink-0"
        aria-label={`Remove ${item.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
