import { Download, Trash2 } from "lucide-react";

import { deleteFile } from "@/app/(app)/dateien/actions";
import { ConfirmActionButton } from "@/components/form/confirm-action-button";
import { EmptyHint, SectionCard } from "@/components/section-card";
import { berlinDate } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { formatBytes } from "@/lib/files/rules";
import type { FileLink } from "@/lib/files/links";
import type { SupabaseServerClient } from "@/lib/supabase/server";

import { FileUpload } from "./file-upload";

const COLUMN = { company: "company_id", deal: "deal_id", project: "project_id" } as const;

export async function FileSection({ supabase, link }: { supabase: SupabaseServerClient; link: FileLink }) {
  const { data: files } = await supabase
    .from("files")
    .select("id, name, groesse, created_at")
    .eq(COLUMN[link.kind], link.id)
    .order("created_at", { ascending: false });

  return (
    <SectionCard title="Dateien">
      <div className="grid gap-4">
        {files?.length ? (
          <ul className="divide-y text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-2">
                <a href={`/dateien/${f.id}`} className="min-w-0 flex-1 hover:underline" download>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Download className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{f.name}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {f.groesse !== null && <>{formatBytes(f.groesse)} · </>}
                    {formatDate(berlinDate(new Date(f.created_at)))}
                  </span>
                </a>
                <ConfirmActionButton
                  action={deleteFile.bind(null, f.id)}
                  confirmMessage={`Datei „${f.name}“ endgültig löschen?`}
                  variant="ghost"
                  size="icon"
                  aria-label={`${f.name} löschen`}
                >
                  <Trash2 />
                </ConfirmActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint>Noch keine Dateien.</EmptyHint>
        )}
        <FileUpload link={link} />
      </div>
    </SectionCard>
  );
}
