export type Showcase = {
 id: string;
 title: string;
 /** Files under public/showcase/. A swap has a source video; a generated
  * video has none. */
 result: string;
 poster: string;
 source?: string;
 /** Label shown when there is no source to compare, e.g. "Edited". */
 tag?: string;
};

/** Finished examples shown on the landing page. Each entry is a real video
 * made with the app; add one by placing its files in public/showcase/. */
export const SHOWCASE: Showcase[] = [
 { id: 'polar-bear', title: 'A goat pulls a polar bear frozen in ice', result: '/showcase/polar-bear-generation.mp4', poster: '/showcase/polar-bear-generation.jpg' },
 { id: 'sneaker-edit', title: 'New sneaker color, same presenter and background', result: '/showcase/sneaker-edit.mp4', poster: '/showcase/sneaker-edit.jpg', tag: 'Edited' },
];

export const FAQ = [
 { q: 'How do my seconds get used?', a: 'Every second of video you create counts once: a 10 second generated video uses 10 seconds, and a 90 second character swap uses 90 seconds.' },
 { q: 'How long does it take?', a: 'Generated videos usually take a few minutes. Character swaps take about 15–20 minutes for every minute of video. You can close the tab; your video appears in your studio when it is ready.' },
 { q: 'Do I need reference images to generate?', a: 'No. Describe the scene and generate it from text alone, or add up to four reference images, such as a character, product or style, to guide it.' },
 { q: 'What videos work best for swaps?', a: 'MP4 or MOV clips from 1 to 10 minutes where the person you want to replace is clearly visible. Steady shots with one main person give the cleanest results.' },
 { q: 'What happens if a video fails?', a: 'Its seconds go straight back into your monthly allowance. You are never charged for a video that does not finish.' },
 { q: 'Do unused seconds roll over?', a: 'No. Your allowance resets at the start of each billing month.' },
 { q: 'How long can I download my videos?', a: 'Finished videos stay available for 7 days, which leaves plenty of time to download them. Save the ones you want to keep.' },
 { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account page; you keep access until the end of the month you paid for.' },
];
