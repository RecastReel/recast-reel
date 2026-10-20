'use client';

import { useState } from 'react';
import { CHARACTERS, type Showcase } from '../lib/catalog';

/** One finished example. Swaps get an Original / Swapped toggle. */
export function ShowcaseCard({ item }: { item: Showcase }) {
 const [view, setView] = useState<'result' | 'source'>('result');
 const character = CHARACTERS.find((c) => c.id === item.characterId);
 return (
  <article className="showcase-card">
   <div className="showcase-media">
    <video key={view} src={view === 'source' && item.source ? item.source : item.result} poster={item.poster} autoPlay muted loop playsInline preload="metadata" />
    {character && <img className="showcase-character" src={character.url} alt={`Character: ${character.name}`} />}
   </div>
   <div className="showcase-foot">
    <h3>{item.title}</h3>
    {item.source ? <div className="segmented" role="group" aria-label="Show">
     <button aria-pressed={view === 'source'} onClick={() => setView('source')}>Original</button>
     <button aria-pressed={view === 'result'} onClick={() => setView('result')}>Swapped</button>
    </div> : <span className="showcase-tag">Generated</span>}
   </div>
  </article>
 );
}
