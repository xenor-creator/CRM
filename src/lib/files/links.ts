import { z } from "zod";

// A file belongs to exactly one company, deal or project page.
export const fileLinkSchema = z.object({
  kind: z.enum(["company", "deal", "project"]),
  id: z.uuid(),
});

export type FileLink = z.infer<typeof fileLinkSchema>;

export const FILE_LINK_TABLES = { company: "companies", deal: "deals", project: "projects" } as const;

export function fileLinkColumns(link: FileLink): { company_id?: string; deal_id?: string; project_id?: string } {
  if (link.kind === "company") return { company_id: link.id };
  if (link.kind === "deal") return { deal_id: link.id };
  return { project_id: link.id };
}
