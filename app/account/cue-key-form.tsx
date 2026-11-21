'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

export function CueKeyForm({ saved }: { saved: boolean }) {
 const [hasKey, setHasKey] = useState(saved);
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 const [error, setError] = useState(false);

 async function save(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = event.currentTarget;
  const key = new FormData(form).get('key');
  setBusy(true);
  setError(false);
  setMessage('');
  try {
   const response = await fetch('/api/account/cue-key', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
   });
   if (!response.ok) throw new Error((await response.json()).message);
   form.reset();
   setHasKey(true);
   setMessage('API key saved. New videos will use this key.');
  } catch (error) {
   setError(true);
   setMessage(error instanceof Error ? error.message : 'Could not save your API key.');
  } finally {
   setBusy(false);
  }
 }

 return <section className="panel" id="api-key">
  <h2>MadeByCue API key</h2>
  <p className="muted">Use your own key to create videos without a Recast Reel subscription. MadeByCue charges your account for generation.</p>
  <p><a href="https://www.madebycue.dev" target="_blank" rel="noreferrer">Get a key from MadeByCue ↗</a></p>
  <form className="cue-key-form" onSubmit={save}>
   <label htmlFor="cue-key">{hasKey ? 'Replace your API key' : 'API key'}</label>
   <input id="cue-key" name="key" type="password" placeholder={hasKey ? 'API key saved' : 'Paste your MadeByCue API key'} autoComplete="off" spellCheck={false} required maxLength={1024} />
   <div className="panel-actions">
    <button className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save API key'}</button>
    {hasKey && <Link className="button-quiet" href="/studio">Open studio</Link>}
   </div>
   {message && <p role={error ? 'alert' : 'status'} className={error ? 'form-error' : 'muted'}>{message}</p>}
  </form>
 </section>;
}
