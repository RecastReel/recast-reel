'use client';

import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Shared rhythm: 0.8s glides, 24px rises, short staggers, reveals once at
 * 85% of the viewport. */
const ENTER = { duration: 0.8, ease: 'power2.out' };
const RISE = 24;
const STAGGER = 0.1;
const START = 'top 85%';

/** Landing page motion. Elements opt in with data attributes:
 * - `data-intro` (mark, title, subhead, cta, stage): the load sequence.
 * - `data-reveal`: rises in once when scrolled into view.
 * - `data-reveal-group`: its children rise in one after another.
 * Rendered once at the end of the page; does nothing for reduced motion. */
export function LandingMotion() {
 useLayoutEffect(() => {
  const root = document.querySelector<HTMLElement>('.site');
  if (!root) return;
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
   if (window.scrollY < 10) intro(root);
   reveals(root);
   studioPreview(root);
   showcase(root);
   modes(root);
   priceCount(root);
   closing(root);
   headerShadow(root);
  }, root);
  root.classList.remove('motion-pending');
  return () => mm.revert();
 }, []);
 return null;
}

function intro(root: HTMLElement) {
 const pick = (key: string) => root.querySelector<HTMLElement>(`[data-intro="${key}"]`);
 const mark = pick('mark');
 const title = pick('title');
 const words = root.querySelectorAll('[data-intro="title"] .word > span');
 const rest = [pick('subhead'), pick('stage')].filter(Boolean);
 const cta = pick('cta');
 const header = root.querySelector('.site-header');
 if (!mark || !title || !cta || !header) return;

 // The mark starts in the middle of the screen, spins in like a recast
 // arrow, then glides up into place above the headline.
 const box = mark.getBoundingClientRect();
 gsap.set(mark, { x: innerWidth / 2 - (box.left + box.width / 2), y: innerHeight / 2 - (box.top + box.height / 2), scale: 0.6, rotate: -180, opacity: 0 });
 gsap.set(words, { yPercent: 110 });
 gsap.set([...rest, cta, header], { opacity: 0 });
 gsap.set(rest, { y: RISE * 2 });
 gsap.set(cta, { y: RISE / 2 });

 gsap.timeline({ onComplete: () => { gsap.set([mark, ...words, ...rest, cta, header], { clearProps: 'all' }); } })
  .to(mark, { opacity: 1, scale: 2, rotate: 0, duration: 0.7, ease: 'power4.out' }, 0)
  .to(mark, { x: 0, y: 0, scale: 1, duration: 0.9, ease: 'power3.inOut' }, 0.6)
  .to(words, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.06 }, 1.05)
  .to(header, { opacity: 1, ...ENTER }, 1.1)
  .to(rest, { opacity: 1, y: 0, ...ENTER, duration: 1, stagger: STAGGER }, 1.35)
  .to(cta, { opacity: 1, y: 0, ...ENTER }, 1.6);
}

function reveals(root: HTMLElement) {
 root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
  gsap.from(el, { y: RISE, opacity: 0, ...ENTER, scrollTrigger: { trigger: el, start: START, once: true } });
 });
 root.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
  gsap.from(group.children, { y: RISE, opacity: 0, ...ENTER, stagger: STAGGER, scrollTrigger: { trigger: group, start: START, once: true } });
 });
}

/** The window tilts back like a screen on a desk, then straightens as it
 * scrolls up; its contents settle in and the render bar keeps moving. */
function studioPreview(root: HTMLElement) {
 const win = root.querySelector('.window');
 if (!win) return;
 gsap.fromTo(win, { rotateX: 16, scale: 0.92, transformPerspective: 1800, transformOrigin: '50% 0%' }, {
  rotateX: 0, scale: 1, ease: 'none',
  scrollTrigger: { trigger: win, start: 'top bottom', end: 'top 20%', scrub: 0.6 },
 });
 const parts = win.querySelectorAll('.side-item, .mock-composer, .mock-card');
 gsap.from(parts, { y: 16, opacity: 0, ...ENTER, stagger: 0.08, delay: 0.3, scrollTrigger: { trigger: win, start: 'top 75%', once: true } });
 gsap.fromTo(win.querySelectorAll('.mock-prompt-text mark'), { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: 0.6, ease: 'power2.inOut', stagger: 0.35, delay: 0.9, scrollTrigger: { trigger: win, start: 'top 75%', once: true } });
 const bar = win.querySelector('.mock-bar span');
 if (bar) gsap.fromTo(bar, { width: '8%' }, { width: '92%', duration: 8, ease: 'none', repeat: -1, repeatDelay: 0.8 });
}

function showcase(root: HTMLElement) {
 root.querySelectorAll('.showcase-card').forEach((card) => {
  gsap.fromTo(card, { scale: 0.92, opacity: 0.4 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 35%', scrub: 0.6 } });
 });
}

/** Generate types its prompt out; Swap assembles clip + character = result. */
function modes(root: HTMLElement) {
 const prompt = root.querySelector<HTMLElement>('.mode-visual-generate .mock-prompt-text');
 const node = prompt && textNode(prompt);
 if (prompt && node) {
  const text = (prompt.dataset.text ??= node.nodeValue ?? '');
  const typed = { n: 0 };
  gsap.set(prompt, { minHeight: prompt.offsetHeight });
  node.nodeValue = '';
  gsap.to(typed, {
   n: text.length, duration: text.length * 0.028, ease: 'none',
   onUpdate: () => { node.nodeValue = text.slice(0, Math.round(typed.n)); },
   scrollTrigger: { trigger: prompt, start: 'top 80%', once: true },
  });
  gsap.from(root.querySelectorAll('.mode-visual-generate .mock-row > *'), { scale: 0.85, opacity: 0, duration: 0.5, ease: 'back.out(2)', stagger: STAGGER, delay: text.length * 0.028, scrollTrigger: { trigger: prompt, start: 'top 80%', once: true } });
 }
 const swap = root.querySelector('.mode-visual-swap');
 if (swap) gsap.from(swap.children, { y: RISE, opacity: 0, scale: 0.96, ...ENTER, stagger: 0.14, scrollTrigger: { trigger: swap, start: 'top 80%', once: true } });
}

function priceCount(root: HTMLElement) {
 const price = root.querySelector<HTMLElement>('.pricing .price strong');
 const node = price && textNode(price, /\d/);
 if (!price || !node) return;
 const label = (price.dataset.text ??= node.nodeValue ?? '');
 const target = Number(label.match(/\d+/)?.[0]);
 if (!target) return;
 const count = { v: 0 };
 gsap.to(count, {
  v: target, duration: 1.2, ease: 'power3.out',
  onUpdate: () => { node.nodeValue = label.replace(/\d+/, String(Math.round(count.v))); },
  scrollTrigger: { trigger: price, start: START, once: true },
 });
}

/** The first text node (optionally matching a pattern). Editing its value,
 * instead of replacing children, leaves React's DOM nodes in place. */
function textNode(el: HTMLElement, match?: RegExp) {
 return [...el.childNodes].find((n): n is Text => n.nodeType === Node.TEXT_NODE && (!match || match.test(n.nodeValue ?? '')));
}

/** The closing line lights up word by word as it scrolls into view. */
function closing(root: HTMLElement) {
 const words = root.querySelectorAll('.closing h2 .word > span');
 if (!words.length) return;
 gsap.fromTo(words, { opacity: 0.15 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: '.closing h2', start: 'top 85%', end: 'top 45%', scrub: true } });
}

function headerShadow(root: HTMLElement) {
 const header = root.querySelector('.site-header');
 if (!header) return;
 ScrollTrigger.create({ start: 8, end: 'max', onToggle: (self) => header.classList.toggle('is-scrolled', self.isActive) });
}
