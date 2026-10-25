import { HttpError } from "./cue";

/** Bound the bytes read, including chunked requests without Content-Length. */
export async function readJsonBody(req: Request, max = 64 * 1024): Promise<Record<string, unknown>> {
  const tooLarge = () => new HttpError("Request is too large.", 413);
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > max) {
    await req.body?.cancel().catch(() => {});
    throw tooLarge();
  }
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError("Invalid request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel().catch(() => {});
        throw tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Expected object");
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError("Invalid request body.");
  }
}
