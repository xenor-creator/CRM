import type { ReactNode } from "react";

// Label/value pairs; rows without a value are skipped.
export function DefinitionList({ items }: { items: [label: string, value: ReactNode][] }) {
  const visible = items.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (visible.length === 0) {
    return <p className="text-muted-foreground text-sm">Keine Angaben.</p>;
  }
  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
      {visible.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-words whitespace-pre-line">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
