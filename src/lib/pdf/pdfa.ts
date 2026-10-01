import { readFile } from "node:fs/promises";
import path from "node:path";

import { AFRelationship, PDFDocument, PDFHexString, PDFName } from "pdf-lib";

import { escapeXml, ZUGFERD_FILENAME } from "@/lib/invoices/zugferd";

const ICC_PATH = path.join(process.cwd(), "src/lib/pdf/assets/sRGB.icc");

const xmpDate = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");

// XMP for PDF/A-3B plus the Factur-X extension schema (required for the fx: properties).
function xmpMetadata(title: string, author: string, now: Date, zugferd: boolean): string {
  const fx = zugferd
    ? `<rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
  <fx:DocumentType>INVOICE</fx:DocumentType>
  <fx:DocumentFileName>${ZUGFERD_FILENAME}</fx:DocumentFileName>
  <fx:Version>1.0</fx:Version>
  <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
  <pdfaExtension:schemas><rdf:Bag><rdf:li rdf:parseType="Resource">
    <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
    <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
    <pdfaSchema:prefix>fx</pdfaSchema:prefix>
    <pdfaSchema:property><rdf:Seq>
      <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentFileName</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>name of the embedded XML invoice file</pdfaProperty:description></rdf:li>
      <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentType</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>INVOICE</pdfaProperty:description></rdf:li>
      <rdf:li rdf:parseType="Resource"><pdfaProperty:name>Version</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>The actual version of the Factur-X XML schema</pdfaProperty:description></rdf:li>
      <rdf:li rdf:parseType="Resource"><pdfaProperty:name>ConformanceLevel</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>The conformance level of the embedded Factur-X data</pdfaProperty:description></rdf:li>
    </rdf:Seq></pdfaSchema:property>
  </rdf:li></rdf:Bag></pdfaExtension:schemas>
</rdf:Description>`
    : "";
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
  <pdfaid:part>3</pdfaid:part>
  <pdfaid:conformance>B</pdfaid:conformance>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:format>application/pdf</dc:format>
  <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>
  <dc:creator><rdf:Seq><rdf:li>${escapeXml(author)}</rdf:li></rdf:Seq></dc:creator>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
  <xmp:CreatorTool>Agentur-CRM</xmp:CreatorTool>
  <xmp:CreateDate>${xmpDate(now)}</xmp:CreateDate>
  <xmp:ModifyDate>${xmpDate(now)}</xmp:ModifyDate>
  <xmp:MetadataDate>${xmpDate(now)}</xmp:MetadataDate>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
  <pdf:Producer>Agentur-CRM</pdf:Producer>
</rdf:Description>
${fx}
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

// Converts a rendered PDF into PDF/A-3B: XMP metadata, sRGB output intent, document ID and,
// for invoices, the embedded ZUGFeRD XML ("Alternative" associated file).
export async function toPdfA3(
  pdfBytes: Uint8Array,
  meta: { title: string; author: string; zugferdXml?: string },
  now: Date = new Date(),
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  pdf.setTitle(meta.title, { showInWindowTitleBar: true });
  pdf.setAuthor(meta.author);
  pdf.setCreator("Agentur-CRM");
  pdf.setProducer("Agentur-CRM");
  pdf.setCreationDate(now);
  pdf.setModificationDate(now);

  if (meta.zugferdXml) {
    await pdf.attach(new TextEncoder().encode(meta.zugferdXml), ZUGFERD_FILENAME, {
      mimeType: "text/xml",
      description: "Factur-X/ZUGFeRD Rechnung (EN 16931)",
      creationDate: now,
      modificationDate: now,
      afRelationship: AFRelationship.Alternative,
    });
  }

  const metadata = pdf.context.stream(new TextEncoder().encode(xmpMetadata(meta.title, meta.author, now, Boolean(meta.zugferdXml))), {
    Type: "Metadata",
    Subtype: "XML",
  });
  pdf.catalog.set(PDFName.of("Metadata"), pdf.context.register(metadata));

  const icc = await readFile(ICC_PATH);
  const iccStream = pdf.context.stream(icc, { N: 3 });
  const outputIntent = pdf.context.obj({
    Type: "OutputIntent",
    S: "GTS_PDFA1",
    OutputConditionIdentifier: PDFHexString.fromText("sRGB IEC61966-2.1"),
    Info: PDFHexString.fromText("sRGB IEC61966-2.1"),
    DestOutputProfile: pdf.context.register(iccStream),
  });
  pdf.catalog.set(PDFName.of("OutputIntents"), pdf.context.obj([pdf.context.register(outputIntent)]));

  const id = PDFHexString.of(Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex"));
  pdf.context.trailerInfo.ID = pdf.context.obj([id, id]);

  return pdf.save({ useObjectStreams: false });
}
