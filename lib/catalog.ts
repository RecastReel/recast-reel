import { MONTHLY_CREDITS, MONTHLY_PRICE_USD } from './monthly-plan';

export type Showcase = {
 id: string;
 title: string;
 /** Files under public/showcase/. A swap has a source video; a generated
  * video has none. */
 result: string;
 /** Has sound worth hearing: autoplays muted with an unmute button. */
 audio?: boolean;
 poster: string;
 source?: string;
 /** Label shown when there is no source to compare, e.g. "Edited". */
 tag?: string;
};

/** Finished examples shown on the landing page. Each entry is a real video
 * made with the app; add one by placing its files in public/showcase/. */
export const SHOWCASE: Showcase[] = [
 { id: 'character-swap', title: 'A new character swapped into a film scene', result: '/showcase/character-swap.mp4', poster: '/showcase/character-swap.jpg', source: '/showcase/source-video.mp4', audio: true },
];

export const FAQ = [
 { q: 'How do credits work?', a: `The US$${MONTHLY_PRICE_USD} monthly subscription adds ${MONTHLY_CREDITS} credits each paid month. One credit is worth US$1 of video. Unused credits never expire. Each video uses what our video provider charges for it, and you see the cost before you start. Generated videos use about 0.21 credits per second, so a 10 second video is about 2.10 credits. Character swaps start from about 0.20 credits per second, so a 90 second swap is about 18 credits.` },
 { q: 'How long does it take?', a: 'Generated videos usually take 5–6 minutes. Character swaps take about 15–20 minutes for every minute of video. You can close the tab; your video appears in your studio when it is ready.' },
 { q: 'Do I need reference images to generate?', a: 'No. Describe the scene and generate it from text alone, or add up to four reference images, such as a character, product or style, to guide it.' },
 { q: 'What videos work best for swaps?', a: 'MP4 or MOV clips from 40 seconds to 10 minutes where the person you want to replace is clearly visible. Steady shots with one main person give the cleanest results.' },
 { q: 'What happens if a video fails?', a: 'Its credits go straight back into your balance. You are never charged for a video that does not finish.' },
 { q: 'Do unused credits roll over?', a: 'Yes. Purchased credits don’t expire and remain available without a subscription.' },
 { q: 'How long can I download my videos?', a: 'Finished videos stay available for 7 days, which leaves plenty of time to download them. Save the ones you want to keep.' },
 { q: 'Is there a subscription?', a: 'Yes. The plan renews monthly. You can cancel through Manage billing in your account.' },
];
