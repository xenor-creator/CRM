export function contactName(contact: { vorname: string | null; nachname: string }): string {
  return [contact.vorname, contact.nachname].filter(Boolean).join(" ");
}
