import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { VIDEO_FEATURES } from '../lib/options';

const FREE_FEATURES = ['Bring your own API key', ...VIDEO_FEATURES];

export function FreePlanCard({ children }: { children: ReactNode }) {
 return <div className="price-card">
  <h3>Bring your own key</h3>
  <div className="price"><strong>Free</strong></div>
  <p className="price-lead">Generation is billed by MadeByCue.</p>
  <ul>
   {FREE_FEATURES.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}
  </ul>
  {children}
 </div>;
}
