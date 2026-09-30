type Address = { strasse: string | null; plz: string | null; ort: string | null; land: string };

// Multi-line postal address; the country is only shown outside Germany.
export function formatAddress(address: Address): string {
  const city = [address.plz, address.ort].filter(Boolean).join(" ");
  if (!address.strasse && !city) {
    return "";
  }
  return [address.strasse, city, address.land === "DE" ? null : address.land]
    .filter(Boolean)
    .join("\n");
}
