import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Duplicate } from "@/lib/form-state";

import { CheckboxField } from "./fields";

const reasons: Record<string, string> = {
  email: "gleiche E-Mail",
  domain: "gleiche Domain",
};

export function DuplicateWarning({ duplicates }: { duplicates: Duplicate[] | undefined }) {
  if (!duplicates?.length) {
    return null;
  }
  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <CardHeader>
        <CardTitle>Mögliche Dubletten</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ul className="grid gap-1 text-sm">
          {duplicates.map((d) => (
            <li key={d.company_id}>
              <Link href={`/firmen/${d.company_id}`} className="font-medium underline" target="_blank">
                {d.company_name}
              </Link>{" "}
              ({d.kundennummer}, {d.grund.split(",").map((g) => reasons[g] ?? g).join(" und ")})
            </li>
          ))}
        </ul>
        <CheckboxField label="Ist keine Dublette, trotzdem speichern" name="duplikat_bestaetigt" defaultChecked={false} />
      </CardContent>
    </Card>
  );
}
