import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { authSecret } from './config';
import { getDb } from './db';
import { cueKeys } from './db/schema';

function encryptionKey() {
 const secret = authSecret();
 if (!secret) throw new Error('Missing server secret');
 return createHmac('sha256', secret).update('recast-reel/cue-keys/v1').digest();
}

export async function findCueKey(userId: string, id?: string) {
 const db = await getDb();
 const [row] = await db.select().from(cueKeys).where(and(
  eq(cueKeys.userId, userId),
  id ? eq(cueKeys.id, id) : eq(cueKeys.active, true),
 ));
 return row;
}

export async function saveCueKey(userId: string, key: string) {
 const db = await getDb();
 const id = randomUUID();
 const iv = randomBytes(12);
 const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
 cipher.setAAD(Buffer.from(JSON.stringify([userId, id])));
 const ciphertext = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]);
 const encryptedKey = [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
 await db.transaction(async (tx) => {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
  await tx.update(cueKeys).set({ active: false }).where(and(eq(cueKeys.userId, userId), eq(cueKeys.active, true)));
  await tx.insert(cueKeys).values({ id, userId, encryptedKey });
 });
}

export function decryptCueKey(row: typeof cueKeys.$inferSelect) {
 const [iv, tag, ciphertext] = row.encryptedKey.split('.').map((part) => Buffer.from(part, 'base64url'));
 const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
 decipher.setAAD(Buffer.from(JSON.stringify([row.userId, row.id])));
 decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
