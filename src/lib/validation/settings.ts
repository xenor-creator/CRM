import { z } from "zod";

import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";

import { requiredText } from "./fields";

export const apiKeySchema = z.object({
  name: requiredText("Bitte einen Namen für den Key eingeben.").pipe(z.string().max(100, "Höchstens 100 Zeichen.")),
});

const webhookUrl = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.union([
    z.literal(""),
    z.url({ protocol: /^https?$/, message: "Bitte eine gültige http(s)-URL eingeben." }).max(2000),
  ]),
);

// One URL field per event, named "url:<event>"; empty fields are dropped.
export const webhookUrlsSchema = z
  .object(Object.fromEntries(WEBHOOK_EVENTS.map((e) => [`url:${e.name}`, webhookUrl])))
  .transform((fields) =>
    Object.fromEntries(
      Object.entries(fields)
        .filter(([, url]) => url !== "")
        .map(([key, url]) => [key.slice(4), url as string]),
    ),
  );
