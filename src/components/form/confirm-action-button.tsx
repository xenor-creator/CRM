"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

// Runs a Server Action after the user confirms, e.g. for deletions.
export function ConfirmActionButton({
  action,
  confirmMessage,
  children,
  ...props
}: {
  action: () => Promise<void>;
  confirmMessage: string;
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "action">) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(action);
        }
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
