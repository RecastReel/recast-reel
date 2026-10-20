/** Recast Reel mark: a recast arrow around a play button. Same art as app/icon.svg. */
export function LogoMark({ size = 26 }: { size?: number }) {
 return (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
   <defs>
    <linearGradient id="rr-bg" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0" stopColor="#2a5d92" />
     <stop offset="1" stopColor="#0d1a2a" />
    </linearGradient>
   </defs>
   <rect width="64" height="64" rx="16" fill="url(#rr-bg)" />
   <path d="M42.93 18.98A17 17 0 1 1 26.19 16.02" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
   <path d="M32.6 13.7 27.9 21.9 24 10.6Z" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
   <path d="M28 24.5v15l12-7.5Z" fill="#b5cce6" stroke="#b5cce6" strokeWidth="2" strokeLinejoin="round" />
  </svg>
 );
}

export function Logo() {
 return <span className="logo"><LogoMark /><span className="logo-word">Recast<span>Reel</span></span></span>;
}
