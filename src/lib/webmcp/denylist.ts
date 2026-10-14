export const forbiddenIdentifier = /(?:user_?id|owner_?id|email|token|secret|password|checkout|payment|stripe|admin|billing_portal|delete|redeem|download|export|login|auth_code|key)/i;
export const toolNamePattern = /^(site|calc|bikes|fit|account)_[a-z][a-z0-9_]*$/;
export const MAX_OUTPUT_CHARS = 16_000;
export const MAX_READS = 4;

export function assertSafeSchema(schema: Record<string, unknown>): void {
  if (schema.type === "object") {
    if (schema.additionalProperties !== false) throw new Error("WebMCP objects must be strict");
    const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
    for (const [name, property] of Object.entries(properties ?? {})) {
      if (forbiddenIdentifier.test(name)) throw new Error("Forbidden WebMCP input property");
      if (typeof property.description !== "string" || !property.description.length || property.description.length > 150) {
        throw new Error("WebMCP input properties require short descriptions");
      }
    }
  }
  for (const value of Object.values(schema)) {
    if (Array.isArray(value)) value.forEach(item => {
      if (item && typeof item === "object") assertSafeSchema(item);
    });
    else if (value && typeof value === "object") assertSafeSchema(value as Record<string, unknown>);
  }
}
