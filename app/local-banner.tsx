import { hasVideoKey, localMode } from '../lib/config';

/** Shown only when running locally (`npm run dev`). */
export function LocalBanner() {
 if (!localMode()) return null;
 return hasVideoKey()
  ? <div className="local-banner" role="status"><strong>Running locally</strong> · No sign-in or billing. Videos are charged to your MadeByCue API key.</div>
  : <div className="local-banner local-banner-warn" role="alert"><strong>Running locally · API key missing</strong> · Add <code>CUE_API_KEY=…</code> to <code>.env.local</code> and restart to create videos. <a href="https://www.madebycue.dev" target="_blank" rel="noreferrer">Get a key</a></div>;
}
