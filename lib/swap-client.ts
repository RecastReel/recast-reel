'use client';

export type PlanStatus = { billing: boolean; active: boolean; cancelAtPeriodEnd: boolean; periodEnd: string | null; creditCents: number; usedCents: number; remainingCents: number };
export type Swap = {
 id: string; kind: 'swap' | 'generate'; status: string; prompt: string; seconds: number; costCents: number; refunded: boolean; createdAt: string; expiresAt?: string;
 message?: string; progress?: { message?: string; stage?: string; percent?: number }; queue?: { position: number };
 estimate?: { stale?: boolean; updatedAt?: string; remainingSeconds?: { low: number; high: number } | null; completionAt?: { earliest: string; latest: string } | null };
 outputs: { mime: string; url: string }[];
};
export type UploadedMedia = { url: string; seconds: number; token: string };

export class SwapError extends Error { constructor(message: string, public status: number) { super(message); } }

export async function swapApi<T>(path: string, body?: unknown, options: { idempotency?: string; signal?: AbortSignal; method?: 'DELETE' } = {}): Promise<T> {
 let response: Response;
 try {
  response = await fetch('/api/swap/' + path, {
   method: options.method ?? (body === undefined ? 'GET' : 'POST'), cache: 'no-store', signal: options.signal,
   headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(options.idempotency ? { 'Idempotency-Key': options.idempotency } : {}) },
   body: body === undefined ? undefined : JSON.stringify(body),
  });
 } catch (error) {
  if (options.signal?.aborted) throw error;
  // Status 0: the request may or may not have reached the server.
  throw new SwapError('Connection lost. Check your internet and try again.', 0);
 }
 const data = await response.json().catch(() => ({ message: 'Unexpected response from the server.' }));
 if (!response.ok) throw new SwapError(data.message || 'The request failed.', response.status);
 return data as T;
}

/** Upload straight to storage: the server only reserves, signs and confirms. */
export async function uploadMedia(file: File, kind: 'image' | 'video', onProgress?: (fraction: number) => void): Promise<UploadedMedia> {
 type Reservation = { key: string; token: string; uploadUrl?: string; multipart?: { uploadId: string; partSize: number; partCount: number } };
 const reservation = await swapApi<Reservation>('uploads', { name: file.name, mime: file.type, size: file.size });
 const ids = { key: reservation.key, token: reservation.token, mime: file.type };
 try {
  if (reservation.multipart) {
   const { uploadId, partSize, partCount } = reservation.multipart;
   const parts: { partNumber: number; etag: string }[] = [];
   for (let partNumber = 1; partNumber <= partCount; partNumber++) {
    const { urls } = await swapApi<{ urls: { partNumber: number; url: string }[] }>('uploads/parts', { ...ids, uploadId, parts: [partNumber] });
    const put = await fetch(urls[0].url, { method: 'PUT', body: file.slice((partNumber - 1) * partSize, partNumber * partSize) });
    const etag = put.headers.get('etag');
    if (!put.ok || !etag) throw new SwapError('Part of the upload failed. Try again.', 502);
    parts.push({ partNumber, etag });
    onProgress?.(partNumber / partCount);
   }
   await swapApi('uploads/complete', { ...ids, uploadId, parts });
  } else {
   const put = await fetch(reservation.uploadUrl!, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
   if (!put.ok) throw new SwapError('The upload failed. Try again.', 502);
   onProgress?.(1);
  }
  return await swapApi<UploadedMedia>('uploads/confirm', { ...ids, kind });
 } catch (error) {
  if (reservation.multipart) void swapApi('uploads/abort', { ...ids, uploadId: reservation.multipart.uploadId }).catch(() => {});
  throw error;
 }
}

export function minutes(seconds: number) {
 const s = Math.max(0, Math.round(seconds));
 return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
