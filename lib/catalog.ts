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
 { id: 'character-swap', title: 'A new character swapped into a film scene', result: '/showcase/character-swap.mp4', poster: '/showcase/character-swap.jpg', tag: 'Swapped', audio: true },
];

export const FAQ = [
 { q: 'How does my credit get used?', a: 'Each video uses what our video provider charges for it, and you see the price before you start. Generated videos cost about $0.21 per second, so a 10 second video is about $2.10. Character swaps cost about $0.18 per second, so a 90 second swap is about $16.20.' },
 { q: 'How long does it take?', a: 'Generated videos usually take 5–6 minutes. Character swaps take about 15–20 minutes for every minute of video. You can close the tab; your video appears in your studio when it is ready.' },
 { q: 'Do I need reference images to generate?', a: 'No. Describe the scene and generate it from text alone, or add up to four reference images, such as a character, product or style, to guide it.' },
 { q: 'What videos work best for swaps?', a: 'MP4 or MOV clips from 1 to 10 minutes where the person you want to replace is clearly visible. Steady shots with one main person give the cleanest results.' },
 { q: 'What happens if a video fails?', a: 'Its credit goes straight back into your monthly balance. You are never charged for a video that does not finish.' },
 { q: 'Does unused credit roll over?', a: 'No. Your credit resets at the start of each billing month.' },
 { q: 'How long can I download my videos?', a: 'Finished videos stay available for 7 days, which leaves plenty of time to download them. Save the ones you want to keep.' },
 { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account page; you keep access until the end of the month you paid for.' },
];
