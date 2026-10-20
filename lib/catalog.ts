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
 { q: 'How do credits work?', a: 'Your plan adds 20 credits every month, and one credit is worth $1 of video. Unused credits roll over, so your balance keeps growing until you use it. Each video uses what our video provider charges for it, and you see the cost before you start. Generated videos use about 0.21 credits per second, so a 10 second video is about 2.10 credits. Character swaps use about 0.18 credits per second, so a 90 second swap is about 16.20 credits.' },
 { q: 'How long does it take?', a: 'Generated videos usually take 5–6 minutes. Character swaps take about 15–20 minutes for every minute of video. You can close the tab; your video appears in your studio when it is ready.' },
 { q: 'Do I need reference images to generate?', a: 'No. Describe the scene and generate it from text alone, or add up to four reference images, such as a character, product or style, to guide it.' },
 { q: 'What videos work best for swaps?', a: 'MP4 or MOV clips from 1 to 10 minutes where the person you want to replace is clearly visible. Steady shots with one main person give the cleanest results.' },
 { q: 'What happens if a video fails?', a: 'Its credits go straight back into your balance. You are never charged for a video that does not finish.' },
 { q: 'Do unused credits roll over?', a: 'Yes. Credits don’t expire. Whatever you don’t use carries over to the next month and adds to your new 20 credits. You can spend them while your subscription is active, and if you cancel, they are still there when you subscribe again.' },
 { q: 'How long can I download my videos?', a: 'Finished videos stay available for 7 days, which leaves plenty of time to download them. Save the ones you want to keep.' },
 { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account page; you keep access until the end of the month you paid for. Your unused credits are kept for when you come back.' },
];
