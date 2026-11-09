// [data-faq]: the <details> items inside open and close with an eased height instead of a jump.
// Plain details/summary underneath, so it still works (and find-in-page still opens items)
// without the script. Reduced motion: native open and close.

import { gsap } from 'gsap';
import { FAQ } from './config.js';
import { currentMode } from './mode.js';

export function setupFaq() {
  document.querySelectorAll('[data-faq] details').forEach((item) => {
    const summary = item.querySelector('summary');
    if (summary) summary.addEventListener('click', (event) => toggle(event, item));
  });
}

function toggle(event, item) {
  if (currentMode().reduced) return;
  event.preventDefault();
  const answer = [...item.children].filter((child) => child.tagName !== 'SUMMARY');
  gsap.killTweensOf(answer);
  if (item.open && !item.dataset.closing) {
    item.dataset.closing = 'true';
    gsap.to(answer, {
      height: 0, opacity: 0, marginTop: 0, overflow: 'hidden', duration: FAQ.close, ease: FAQ.ease,
      onComplete: () => {
        item.open = false;
        delete item.dataset.closing;
        gsap.set(answer, { clearProps: 'height,opacity,marginTop,overflow' });
      },
    });
    return;
  }
  delete item.dataset.closing;
  item.open = true;
  gsap.fromTo(answer,
    { height: 0, opacity: 0, marginTop: 0, overflow: 'hidden' },
    {
      height: 'auto', opacity: 1, marginTop: (index, element) => openMargin(element), duration: FAQ.open, ease: FAQ.ease,
      onComplete: () => gsap.set(answer, { clearProps: 'height,opacity,marginTop,overflow' }),
    });
}

// The answer's own top margin from the stylesheet, so the open state matches the no-script one.
function openMargin(element) {
  const inline = element.style.marginTop;
  element.style.marginTop = '';
  const margin = getComputedStyle(element).marginTop;
  element.style.marginTop = inline;
  return margin;
}
