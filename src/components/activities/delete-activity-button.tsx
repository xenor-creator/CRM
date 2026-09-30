"use client";

import { Trash2 } from "lucide-react";

import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { deleteActivity } from "@/lib/actions/activities";

export function DeleteActivityButton({ id }: { id: string }) {
  return (
    <ConfirmActionButton
      action={deleteActivity.bind(null, id)}
      confirmMessage="Diese Aktivität löschen?"
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label="Aktivität löschen"
    >
      <Trash2 className="size-3.5" />
    </ConfirmActionButton>
  );
}
