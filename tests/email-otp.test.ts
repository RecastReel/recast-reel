import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';

test('email-code sign-in lifecycle against an isolated database', async (t) => {
 const directory = await mkdtemp(join(tmpdir(), 'recast-otp-test-'));
 // This test worker never connects to a real database or sends real email.
 delete process.env.DATABASE_URL;
 delete process.env.RESEND_API_KEY;
 Object.assign(process.env, { NODE_ENV: 'test' });
 process.env.DATA_DIR = directory;
 process.env.BETTER_AUTH_URL = 'http://localhost:3000';
 const { getAuth } = await import('../lib/auth');
 const { getDb } = await import('../lib/db');
 const { verification } = await import('../lib/db/schema');
 const { localSignInCode } = await import('../lib/email');
 const auth = await getAuth();
 const db = await getDb();
 async function send(email: string) {
  await auth.api.sendVerificationOTP({ body: { email, type: 'sign-in' } });
  const code = localSignInCode(email);
  assert.match(code ?? '', /^\d{6}$/);
  return code!;
 }
 const verify = (email: string, otp: string) => auth.api.signInEmailOTP({ body: { email, otp }, asResponse: true });
 try {
  await t.test('codes are protected in storage and create a verified session', async () => {
   const email = 'new-user@example.com';
   const code = await send(email);
   const rows = await db.select().from(verification);
   assert.ok(rows.length);
   assert.ok(rows.every((row) => !row.value.startsWith(code + ':')));
   const response = await verify(email, code);
   assert.equal(response.status, 200);
   assert.ok(response.headers.get('set-cookie'));
   const data = await response.json();
   assert.equal(data.user.email, email);
   assert.equal(data.user.emailVerified, true);
   assert.equal((await verify(email, code)).status, 400);
   const nextCode = await send(email);
   const next = await verify(email, nextCode);
   assert.equal(next.status, 200);
   assert.equal((await next.json()).user.id, data.user.id);
  });
  await t.test('three incorrect attempts lock out even the correct code', async () => {
   const email = 'attempt-limit@example.com';
   const code = await send(email);
   const wrong = code === '000000' ? '111111' : '000000';
   for (let i = 0; i < 3; i++) assert.equal((await verify(email, wrong)).status, 400);
   assert.equal((await verify(email, code)).status, 403);
  });
  await t.test('expired codes cannot create sessions', async () => {
   const email = 'expired@example.com';
   const code = await send(email);
   await db.update(verification).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(verification.identifier, `sign-in-otp-${email}`));
   assert.equal((await verify(email, code)).status, 400);
  });
  await t.test('resending invalidates the earlier code', async () => {
   const email = 'resend@example.com';
   const old = await send(email);
   let fresh = await send(email);
   if (fresh === old) fresh = await send(email);
   assert.notEqual(fresh, old);
   assert.equal((await verify(email, old)).status, 400);
   assert.equal((await verify(email, fresh)).status, 200);
  });
  await t.test('development code endpoint is unavailable when email delivery is configured', async () => {
   process.env.RESEND_API_KEY = 'test-placeholder-not-used-for-delivery';
   assert.equal(localSignInCode('new-user@example.com'), undefined);
   delete process.env.RESEND_API_KEY;
  });
 } finally {
  await (db as unknown as { $client: { close(): Promise<void> } }).$client.close();
  await rm(directory, { recursive: true, force: true });
 }
});
