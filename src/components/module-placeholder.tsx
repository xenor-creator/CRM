import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { PageHeader } from "./page-header";

// Marks a module that is scheduled for a later phase of the implementation plan.
export function ModulePlaceholder({
  title,
  phase,
  scope,
}: {
  title: string;
  phase: number;
  scope: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <CardHeader>
          <CardTitle>Folgt in Phase {phase}</CardTitle>
          <CardDescription>{scope}</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
