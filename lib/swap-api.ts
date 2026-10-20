import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  cueJson,
  HttpError,
  mediaToken,
  safeUploadUrl,
  upstream,
  uploadedVideoSeconds,
  verifyMedia,
} from "./cue";
import { getDb } from "./db";
import { swaps } from "./db/schema";
import { GENERATE_RATIOS, GENERATE_SECONDS, MAX_REFERENCES, credits } from "./options";
import { MAX_SWAP_SECONDS, MIN_SWAP_SECONDS, planStatus } from "./plan";
import { sessionFor } from "./session";

const TERMINAL = ["succeeded", "failed", "needs_input", "cancelled", "expired"];
const REFUNDABLE = ["failed", "needs_input", "cancelled", "expired"];
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

async function currentUser(req: NextRequest) {
  const session = await sessionFor(req.headers);
  if (!session) throw new HttpError("Sign in to continue.", 401);
  return session.user;
}
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).host !== req.headers.get("host"))
    throw new HttpError("Untrusted request origin.", 403);
}
async function requirePlan(
  userId: string,
  executor?: Parameters<typeof planStatus>[1],
) {
  const plan = await planStatus(userId, executor);
  if (!plan.active) throw new HttpError("Subscribe to start swapping.", 402);
  return plan;
}
async function body(req: NextRequest, max = 64 * 1024) {
  const raw = await req.text();
  if (Buffer.byteLength(raw) > max)
    throw new HttpError("Request is too large.", 413);
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new HttpError("Invalid request body.");
  }
}
const uploadToken = (userId: string, key: string) =>
  mediaToken(userId, `upload:${key}`);
function ownUpload(userId: string, input: Record<string, unknown>) {
  if (
    typeof input.key !== "string" ||
    !verifyMedia(userId, `upload:${input.key}`, 0, input.token)
  )
    throw new HttpError("Upload not found. Start the upload again.", 404);
  return input.key;
}

/** Public task shape: status, progress and our own output URLs only. */
function publicSwap(row: typeof swaps.$inferSelect) {
  const task = (row.task ?? {}) as {
    progress?: unknown;
    estimate?: unknown;
    message?: string;
    outputs?: { mime: string }[];
    queue?: unknown;
    expires_at?: string;
  };
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    prompt: row.prompt,
    seconds: row.seconds,
    costCents: row.costCents,
    refunded: row.refunded,
    createdAt: row.createdAt.toISOString(),
    progress: task.progress,
    estimate: task.estimate,
    queue: task.queue,
    message: task.message,
    expiresAt: task.expires_at,
    outputs: (task.outputs ?? []).map((output, index) => ({
      mime: output.mime,
      url: `/api/swap/swaps/${row.id}/outputs/${index}`,
    })),
  };
}

/** Pull the latest task state; a swap that ends without a result stops
 * counting against the credit. */
async function refresh(row: typeof swaps.$inferSelect) {
  if (TERMINAL.includes(row.status)) return row;
  const db = await getDb();
  if (!row.taskId) {
    // Never reached MadeByCue (its answer was lost and nobody retried):
    // after a while, stop holding its cost.
    if (Date.now() - row.createdAt.getTime() < 15 * 60 * 1000) return row;
    const [failed] = await db
      .update(swaps)
      .set({ status: "failed", refunded: true, updatedAt: new Date() })
      .where(and(eq(swaps.id, row.id), isNull(swaps.taskId)))
      .returning();
    return failed ?? row;
  }
  let task: Record<string, unknown>;
  try {
    task = await (await upstream(`/api/v1/tasks/${row.taskId}`)).json();
  } catch (error) {
    // MadeByCue deletes tasks after 7 days; one that never finished is
    // over, and its hold was released, so return its cost.
    if (!(error instanceof HttpError && error.status === 404)) throw error;
    task = { ...(row.task ?? {}), status: "expired" };
  }
  const status = String(task.status);
  const [updated] = await db
    .update(swaps)
    .set({
      status,
      task,
      costCents: costCents(status, task.cost, row.costCents),
      refunded: REFUNDABLE.includes(status) ? true : row.refunded,
      updatedAt: new Date(),
    })
    .where(eq(swaps.id, row.id))
    .returning();
  return updated ?? row;
}

const toCents = (usd: unknown) =>
  typeof usd === "number" && Number.isFinite(usd) ? Math.ceil(usd * 100 - 1e-6) : null;

/** What a task counts against the credit: what MadeByCue charged once it has
 * settled, and until then the larger of our estimate and the charge so far. */
function costCents(status: string, cost: unknown, reserved: number) {
  const { charged, held } = (cost ?? {}) as { charged?: unknown; held?: unknown };
  const cents = toCents(charged);
  if (cents === null) return reserved;
  const settled = TERMINAL.includes(status) && !held;
  return settled ? cents : Math.max(reserved, cents);
}

/** MadeByCue's price for a task, in cents. Estimating is free and starts
 * nothing. */
async function estimateCents(estimate: Record<string, unknown>) {
  const result = await cueJson<{
    cost?: { estimated?: number | null };
    initial_hold?: { amount?: number };
  }>("/api/v1/estimate", estimate);
  const cents =
    toCents(result.cost?.estimated) ?? toCents(result.initial_hold?.amount);
  if (cents === null)
    throw new HttpError("Couldn't price this video. Try again shortly.", 502);
  return cents;
}

/** Turn a request into the MadeByCue task, plus the body that prices it.
 * Only signed media from this user is accepted. */
export function buildRequest(userId: string, input: Record<string, unknown>) {
  const text =
    typeof input.prompt === "string" ? input.prompt.trim().slice(0, 1600) : "";
  if (input.kind === "generate") {
    if (text.length < 3)
      throw new HttpError("Describe the video you want to create.");
    const seconds = Number(input.seconds);
    if (!GENERATE_SECONDS.includes(seconds))
      throw new HttpError("Choose a length of 5, 10 or 15 seconds.");
    const ratio = String(input.aspectRatio ?? "16:9");
    if (!GENERATE_RATIOS.includes(ratio))
      throw new HttpError("Choose a 16:9, 9:16 or 1:1 video.");
    const references = Array.isArray(input.references)
      ? (input.references as Record<string, unknown>[])
      : [];
    if (references.length > MAX_REFERENCES)
      throw new HttpError(`Use up to ${MAX_REFERENCES} reference images.`);
    if (
      !references.every((ref) => verifyMedia(userId, ref?.url, 0, ref?.token))
    )
      throw new HttpError("Upload the reference images again.");
    const task = {
      model: "minimax-h3",
      prompt: text,
      duration_seconds: seconds,
      aspect_ratio: ratio,
      resolution: "768p",
      audio: "generate",
      reference_images: references.map((ref) => ref.url),
    };
    return {
      kind: "generate" as const,
      seconds,
      prompt: text,
      task,
      estimate: task,
    };
  }
  const video = input.video as Record<string, unknown> | undefined;
  const character = input.character as Record<string, unknown> | undefined;
  if (!video || !verifyMedia(userId, video.url, video.seconds, video.token))
    throw new HttpError("Upload the source video again.");
  if (!character || !verifyMedia(userId, character.url, 0, character.token))
    throw new HttpError("Upload the character image again.");
  const prompt =
    text.length >= 3
      ? text
      : "Replace the main character with the character in the reference image. Preserve the source scene and movement.";
  const seconds = Math.ceil(Number(video.seconds));
  const task = {
    model: "swap",
    source_video: video.url,
    reference_images: [character.url],
    prompt,
  };
  return {
    kind: "swap" as const,
    seconds,
    prompt,
    task,
    // Only the estimate endpoint takes the source length.
    estimate: { ...task, source_duration_seconds: seconds },
  };
}

async function createSwap(req: NextRequest, userId: string) {
  const key = req.headers.get("idempotency-key");
  if (!key || !/^[A-Za-z0-9_-]{8,128}$/.test(key))
    throw new HttpError("A valid idempotency key is required.");
  const {
    kind,
    seconds,
    prompt,
    task: request,
    estimate,
  } = buildRequest(userId, await body(req));
  const cents = await estimateCents(estimate);
  const db = await getDb();
  // Serialize reservations per user so two tabs can't overspend the credit.
  const reserved = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [existing] = await tx
      .select()
      .from(swaps)
      .where(and(eq(swaps.userId, userId), eq(swaps.idempotencyKey, key)));
    // A definite rejection was refunded; retrying it under the same key
    // would create a video that never counts against the credit.
    if (existing?.refunded && !existing.taskId)
      throw new HttpError("That attempt didn't go through. Start it again.", 409);
    if (existing) return existing;
    const plan = await requirePlan(userId, tx);
    if (cents > plan.remainingCents)
      throw new HttpError(
        `This video costs ${credits(cents)} and you have ${credits(plan.remainingCents)} left.`,
        402,
      );
    const [row] = await tx
      .insert(swaps)
      .values({
        id: randomUUID(),
        userId,
        kind,
        idempotencyKey: key,
        prompt,
        seconds,
        costCents: cents,
      })
      .returning();
    return row!;
  });
  if (reserved.taskId) return reserved;
  try {
    const task = await cueJson<Record<string, unknown>>(
      "/api/v1/tasks",
      request,
      { "Idempotency-Key": `swap-${reserved.id}` },
    );
    const [row] = await db
      .update(swaps)
      .set({
        taskId: String(task.id),
        status: String(task.status),
        task,
        updatedAt: new Date(),
      })
      .where(eq(swaps.id, reserved.id))
      .returning();
    return row!;
  } catch (error) {
    // Only a definite rejection refunds; an unknown outcome keeps the
    // reservation so a retry with the same key reaches the same task.
    if (error instanceof HttpError && error.status < 500)
      await db
        .update(swaps)
        .set({ status: "failed", refunded: true, updatedAt: new Date() })
        .where(eq(swaps.id, reserved.id));
    throw error;
  }
}

export async function handleSwap(req: NextRequest, segments: string[]) {
  try {
    if (req.method !== "GET") sameOrigin(req);
    const path = segments.join("/");
    const user = await currentUser(req);
    const db = await getDb();

    if (path === "me" && req.method === "GET")
      return json({
        user: { email: user.email },
        plan: await planStatus(user.id),
      });

    if (path === "swaps" && req.method === "GET") {
      const rows = await db
        .select()
        .from(swaps)
        .where(eq(swaps.userId, user.id))
        .orderBy(desc(swaps.createdAt))
        .limit(50);
      const fresh = await Promise.all(
        rows.map((row) => refresh(row).catch(() => row)),
      );
      return json({ swaps: fresh.map(publicSwap) });
    }
    if (path === "swaps" && req.method === "POST")
      return json(publicSwap(await createSwap(req, user.id)), 201);
    if (path === "swaps/estimate" && req.method === "POST") {
      await requirePlan(user.id);
      const { estimate } = buildRequest(user.id, await body(req));
      return json({ costCents: await estimateCents(estimate) });
    }

    const match = path.match(
      /^swaps\/([0-9a-f-]{36})(?:\/outputs\/(\d{1,2}))?$/,
    );
    if (match && req.method === "GET") {
      const [row] = await db
        .select()
        .from(swaps)
        .where(and(eq(swaps.id, match[1]), eq(swaps.userId, user.id)));
      if (!row) throw new HttpError("Swap not found.", 404);
      if (!match[2]) return json(publicSwap(await refresh(row)));
      if (!row.taskId) throw new HttpError("This swap has no result yet.", 404);
      const response = await upstream(
        `/api/v1/tasks/${row.taskId}/outputs/${match[2]}`,
        {
          headers: req.headers.has("range")
            ? { Range: req.headers.get("range")! }
            : {},
        },
      );
      const headers = new Headers({
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      for (const name of [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
      ]) {
        const value = response.headers.get(name);
        if (value) headers.set(name, value);
      }
      if (req.nextUrl.searchParams.has("download"))
        headers.set(
          "Content-Disposition",
          'attachment; filename="recast-reel.mp4"',
        );
      return new NextResponse(response.body, {
        status: response.status,
        headers,
      });
    }

    // Direct uploads: the browser PUTs bytes to presigned storage URLs; this
    // server only reserves, signs and confirms.
    if (path === "uploads" && req.method === "POST") {
      await requirePlan(user.id);
      const input = await body(req);
      const mime = String(input.mime),
        size = Number(input.size);
      const image = IMAGE_TYPES.includes(mime);
      if (!image && !VIDEO_TYPES.includes(mime))
        throw new HttpError(
          image ? "Unsupported image." : "Upload an MP4 or MOV video.",
        );
      if (
        !Number.isInteger(size) ||
        size <= 0 ||
        size > (image ? 20 : 1024) * 1024 * 1024
      )
        throw new HttpError(
          image ? "Images must be under 20 MB." : "Videos must be under 1 GB.",
          413,
        );
      const reservation = await cueJson<{
        key: string;
        uploadUrl?: string;
        multipart?: { uploadId: string; partSize: number; partCount: number };
      }>("/api/media/request-upload", {
        name: String(input.name || "upload").slice(0, 200),
        mime,
        size,
      });
      return json(
        {
          key: reservation.key,
          token: uploadToken(user.id, reservation.key),
          uploadUrl: reservation.uploadUrl
            ? safeUploadUrl(reservation.uploadUrl)
            : undefined,
          multipart: reservation.multipart,
        },
        201,
      );
    }
    if (path === "uploads/parts" && req.method === "POST") {
      const input = await body(req);
      const result = await cueJson<{
        urls: { partNumber: number; url: string }[];
      }>("/api/media/upload-parts", {
        key: ownUpload(user.id, input),
        uploadId: input.uploadId,
        parts: input.parts,
      });
      return json({
        urls: result.urls.map((part) => ({
          partNumber: part.partNumber,
          url: safeUploadUrl(part.url),
        })),
      });
    }
    if (path === "uploads/complete" && req.method === "POST") {
      const input = await body(req, 256 * 1024);
      return json(
        await cueJson("/api/media/complete-upload", {
          key: ownUpload(user.id, input),
          uploadId: input.uploadId,
          parts: input.parts,
        }),
      );
    }
    if (path === "uploads/abort" && req.method === "POST") {
      const input = await body(req);
      return json(
        await cueJson("/api/media/abort-upload", {
          key: ownUpload(user.id, input),
          uploadId: input.uploadId,
        }),
      );
    }
    if (path === "uploads/confirm" && req.method === "POST") {
      const input = await body(req);
      const confirmed = await cueJson<{ url: string; mime?: string }>(
        "/api/media/confirm",
        { key: ownUpload(user.id, input) },
      );
      if (input.kind !== "video")
        return json({
          url: confirmed.url,
          seconds: 0,
          token: mediaToken(user.id, confirmed.url),
        });
      const measured = await uploadedVideoSeconds(confirmed.url);
      if (
        measured < MIN_SWAP_SECONDS - 0.5 ||
        measured > MAX_SWAP_SECONDS + 0.5
      )
        throw new HttpError(
          `Swaps need a video between ${MIN_SWAP_SECONDS / 60} and ${MAX_SWAP_SECONDS / 60} minutes long.`,
          422,
        );
      const seconds = Math.min(
        MAX_SWAP_SECONDS,
        Math.max(MIN_SWAP_SECONDS, Math.ceil(measured)),
      );
      return json({
        url: confirmed.url,
        seconds,
        token: mediaToken(user.id, confirmed.url, seconds),
      });
    }
    throw new HttpError("Not found.", 404);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 502;
    if (!(error instanceof HttpError))
      console.error("Swap request failed", error);
    return json(
      {
        message:
          error instanceof HttpError
            ? error.message
            : "Something went wrong. Please retry.",
      },
      status,
    );
  }
}
