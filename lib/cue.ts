import { createHmac, timingSafeEqual } from "node:crypto";
import { authSecret, isProduction } from "./config";
import { mp4Duration } from "./mp4";

/** Server-only MadeByCue client. Every customer request uses the platform
 * key; customers never see or supply one. */
const BASE = process.env.CUE_API_URL || "https://www.madebycue.dev";

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function platformKey() {
  const key = process.env.CUE_API_KEY;
  if (!key)
    throw new HttpError(
      isProduction
        ? "Video creation is temporarily unavailable."
        : "Add your MadeByCue API key as CUE_API_KEY in .env.local, then restart.",
      503,
    );
  return key;
}

export async function upstream(path: string, init: RequestInit = {}) {
  const response = await fetch(BASE + path, {
    ...init,
    cache: "no-store",
    redirect: init.redirect ?? "follow",
    headers: { ...init.headers, Authorization: `Bearer ${platformKey()}` },
    signal: init.signal ?? AbortSignal.timeout(120000),
  });
  if (!response.ok && !(response.status >= 300 && response.status < 400)) {
    const body = await response.json().catch(() => ({}));
    // Provider billing and key problems are ours to fix, not the customer's.
    if ([401, 402, 403].includes(response.status)) {
      console.error("MadeByCue rejected the platform key", {
        path,
        status: response.status,
        body,
      });
      throw new HttpError(
        "Swapping is temporarily unavailable. Please try again soon.",
        503,
      );
    }
    const fallback: Record<number, string> = {
      404: "This swap or video has expired or is unavailable.",
      429: "We are busy right now. Please retry shortly.",
    };
    const detail =
      typeof body.message === "string" ? body.message : body.error?.message;
    throw new HttpError(
      (
        detail ||
        fallback[response.status] ||
        "The swap service could not complete the request."
      ).slice(0, 500),
      response.status >= 500 ? 502 : response.status,
    );
  }
  return response;
}

export async function cueJson<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  return (
    await upstream(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    })
  ).json();
}

/** Presigned storage URLs must point at MadeByCue's storage. */
export function safeUploadUrl(raw: unknown): string {
  if (typeof raw !== "string")
    throw new HttpError("The upload service returned no upload URL.", 502);
  const url = new URL(raw, BASE);
  const host = url.hostname;
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !(
      host.endsWith(".r2.cloudflarestorage.com") ||
      host === "madebycue.dev" ||
      host.endsWith(".madebycue.dev")
    )
  )
    throw new HttpError(
      "The upload service returned an unsupported storage host.",
      502,
    );
  return url.href;
}

/** Media references are signed for one user so nobody can swap with
 * someone else's upload or misstate a video's length. */
function sign(payload: string) {
  const secret = authSecret();
  if (!secret) throw new HttpError("Server is not configured.", 503);
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
export function mediaToken(userId: string, url: string, seconds = 0) {
  return sign(`${userId}|${url}|${seconds}`);
}
export function verifyMedia(
  userId: string,
  url: unknown,
  seconds: unknown,
  token: unknown,
) {
  if (
    typeof url !== "string" ||
    typeof token !== "string" ||
    typeof seconds !== "number"
  )
    return false;
  const a = Buffer.from(token),
    b = Buffer.from(mediaToken(userId, url, seconds));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Read an uploaded MP4's length with a few range requests, wherever its
 * `moov` box sits, without downloading the video. */
export async function uploadedVideoSeconds(mediaUrl: string): Promise<number> {
  const located = await upstream(new URL(mediaUrl, BASE).pathname, {
    redirect: "manual",
  });
  const signed =
    located.status >= 300 && located.status < 400
      ? located.headers.get("location")
      : null;
  const target = signed
    ? safeUploadUrl(signed)
    : BASE + new URL(mediaUrl, BASE).pathname;
  const auth: Record<string, string> = signed
    ? {}
    : { Authorization: `Bearer ${platformKey()}` };
  const range = async (start: number, end: number) => {
    const response = await fetch(target, {
      headers: { ...auth, Range: `bytes=${start}-${end}` },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (response.status !== 206)
      throw new HttpError(
        "Could not read the video. Upload an MP4 or MOV file.",
        422,
      );
    const total = Number(response.headers.get("content-range")?.split("/")[1]);
    return { bytes: new Uint8Array(await response.arrayBuffer()), total };
  };
  const head = await range(0, 15);
  const total = head.total;
  if (!Number.isFinite(total) || total <= 0)
    throw new HttpError("Could not read the video length.", 422);
  // Walk top-level boxes using only their 16-byte headers.
  let at = 0;
  for (let hops = 0; hops < 64 && at + 8 <= total; hops++) {
    const { bytes } =
      at === 0 ? head : await range(at, Math.min(at + 15, total - 1));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let size = view.getUint32(0);
    if (size === 1) size = Number(view.getBigUint64(8));
    else if (size === 0) size = total - at;
    const name = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (size < 8) break;
    if (name === "moov") {
      if (size > 64 * 1024 * 1024) break;
      const moov = await range(at, at + size - 1);
      const seconds = mp4Duration(moov.bytes);
      if (seconds && Number.isFinite(seconds)) return seconds;
      break;
    }
    at += size;
  }
  throw new HttpError(
    "Could not read the video length. Upload an MP4 or MOV file.",
    422,
  );
}
