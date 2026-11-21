import { HttpError } from '../../../../lib/cue';
import { saveCueKey } from '../../../../lib/cue-keys';
import { readJsonBody } from '../../../../lib/request-body';
import { sessionFor } from '../../../../lib/session';

export async function PUT(req: Request) {
 const headers = { 'Cache-Control': 'private, no-store' };
 try {
  const origin = URL.parse(req.headers.get('origin') ?? '');
  if (!origin || origin.host !== req.headers.get('host'))
   throw new HttpError('Untrusted request origin.', 403);
  const session = await sessionFor(req.headers);
  if (!session) throw new HttpError('Sign in to continue.', 401);
  const { key } = await readJsonBody(req, 4096);
  const value = typeof key === 'string' ? key.trim() : '';
  if (!/^[!-~]{1,1024}$/.test(value)) throw new HttpError('Enter a valid MadeByCue API key.');
  await saveCueKey(session.user.id, value);
  return Response.json({ saved: true }, { headers });
 } catch (error) {
  return Response.json(
   { message: error instanceof HttpError ? error.message : 'Could not save your API key. Try again.' },
   { status: error instanceof HttpError ? error.status : 500, headers },
  );
 }
}
