import type { Metadata } from 'next';
import { LocalBanner } from './local-banner';
import './globals.css';
export const metadata: Metadata = { title: 'Recast Reel — Create videos and swap characters', description: 'Generate videos with or without reference images, or swap a character into your own clip. $25/month for 120 seconds of video.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body><LocalBanner />{children}</body></html> }
