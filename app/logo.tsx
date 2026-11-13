/** Recast Reel mark: a recast arrow around a play button. Same art as
 * app/icon.svg, drawn in the current ink colour so it follows the theme. */
export function LogoMark({ size = 26 }: { size?: number }) {
 return (
  <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
   <rect width="64" height="64" rx="16" fill="currentColor" />
   <g style={{ stroke: 'var(--canvas)', fill: 'var(--canvas)' }}>
    <path d="M42.93 18.98A17 17 0 1 1 26.19 16.02" fill="none" strokeWidth="5" strokeLinecap="round" />
    <path d="M32.6 13.7 27.9 21.9 24 10.6Z" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M28 24.5v15l12-7.5Z" strokeWidth="2" strokeLinejoin="round" />
   </g>
  </svg>
 );
}

export function Logo() {
 return <span className="logo"><LogoMark /><span className="logo-word">Recast Reel</span></span>;
}
