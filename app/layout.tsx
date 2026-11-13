import { MONTHLY_CREDITS, MONTHLY_PRICE_USD } from '../lib/monthly-plan';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { LocalBanner } from './local-banner';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = { title: 'Recast Reel — Create videos and swap characters', description: `Generate videos with or without reference images, or swap a character into your own clip. Get ${MONTHLY_CREDITS} credits per month for US$${MONTHLY_PRICE_USD} before tax.` };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en" className={manrope.variable}><body><LocalBanner />{children}</body></html> }
