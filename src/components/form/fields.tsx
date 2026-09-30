"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

// Value to show in a field: the resubmitted value after an error, else the stored default.
export function valueOf(state: FormState, name: string, fallback: string | number | null | undefined) {
  return state.values?.[name] ?? (fallback == null ? "" : String(fallback));
}

export function TextField({
  label,
  name,
  defaultValue,
  className,
  ...props
}: { label: string; name: string; defaultValue: string } & Omit<
  React.ComponentProps<"input">,
  "name" | "defaultValue"
>) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} {...props} />
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  defaultValue,
  className,
  ...props
}: { label: string; name: string; defaultValue: string } & Omit<
  React.ComponentProps<"textarea">,
  "name" | "defaultValue"
>) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={defaultValue} {...props} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
  emptyLabel,
  className,
  ...props
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: readonly Option[];
  emptyLabel?: string;
} & Omit<React.ComponentProps<"select">, "name" | "defaultValue">) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      <NativeSelect id={name} name={name} defaultValue={defaultValue} {...props}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
  description,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="border-input accent-primary mt-0.5 size-4 shrink-0 rounded"
      />
      <div className="grid gap-1">
        <Label htmlFor={name}>{label}</Label>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
    </div>
  );
}

export function FormError({ state }: { state: FormState }) {
  if (!state.error) {
    return null;
  }
  return (
    <p role="alert" className="text-destructive text-sm">
      {state.error}
    </p>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Speichern …",
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
