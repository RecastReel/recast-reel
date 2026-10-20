import { headers } from 'next/headers';
import { getAuth } from './auth';
import { localMode } from './config';
import { getDb } from './db';
import { user } from './db/schema';

const LOCAL_USER = { id: 'local', name: 'Local', email: 'local@localhost' };

/** Local mode has one built-in user, so there's nothing to sign in to. */
async function localSession() {
 const db = await getDb();
 await db.insert(user).values({ ...LOCAL_USER, emailVerified: true }).onConflictDoNothing();
 return { user: LOCAL_USER };
}

export async function sessionFor(requestHeaders: Headers) {
 if (localMode()) return localSession();
 return (await getAuth()).api.getSession({ headers: requestHeaders });
}

export async function currentSession() {
 return sessionFor(await headers());
}
