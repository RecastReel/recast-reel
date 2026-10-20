'use client';

import { useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { Showcase } from '../lib/catalog';

/** One finished example. Swaps get an Original / Swapped toggle; examples
 * with sound autoplay muted and get an unmute button. */
export function ShowcaseCard({ item }: { item: Showcase }) {
 const [view, setView] = useState<'result' | 'source'>('result');
 const [muted, setMuted] = useState(true);
 const video = useRef<HTMLVideoElement>(null);
 function toggleSound() {
  const el = video.current;
  if (!el) return;
  el.muted = !muted;
  if (!el.muted) void el.play().catch(() => {});
  setMuted(el.muted);
 }
 return (
  <article className="showcase-card">
   <div className="showcase-media">
    <video ref={video} key={view} src={view === 'source' && item.source ? item.source : item.result} poster={item.poster} autoPlay muted={muted} loop playsInline preload="metadata" />
    {item.audio && <button className="showcase-sound" onClick={toggleSound} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={!muted}>
     {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>}
   </div>
   <div className="showcase-foot">
    <h3>{item.title}</h3>
    {item.source ? <div className="segmented" role="group" aria-label="Show">
     <button aria-pressed={view === 'source'} onClick={() => setView('source')}>Original</button>
     <button aria-pressed={view === 'result'} onClick={() => setView('result')}>Swapped</button>
    </div> : <span className="showcase-tag">{item.tag ?? 'Generated'}</span>}
   </div>
  </article>
 );
}
