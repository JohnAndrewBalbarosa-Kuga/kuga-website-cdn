// [data-counter]: counts up to the number written in the element ("450 kW", "1.27 MW", "2023"),
// keeping the text around it and its decimals. A plain year counts from COUNTER.yearSpan years
// earlier; data-counter-from="..." sets the start. Text without a single number is left alone.
// Reduced motion: the final text fades in.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { COUNTER } from './config.js';

const NUMBER_IN_TEXT = /^(\D*)(\d[\d,]*(?:\.\d+)?)(\D*)$/;

export function setupCounters(mode) {
  document.querySelectorAll('[data-counter]').forEach((element) => {
    const parts = readNumber(element);
    if (mode.reduced || !parts) {
      gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      return;
    }
    const state = { value: startValue(element, parts) };
    const show = () => { element.textContent = parts.prefix + format(state.value, parts) + parts.suffix; };
    show();
    gsap.set(element, { opacity: 1 });
    ScrollTrigger.create({
      trigger: element,
      start: COUNTER.start,
      once: true,
      onEnter: () => gsap.to(state, { value: parts.value, duration: COUNTER.duration, ease: COUNTER.ease, onUpdate: show }),
    });
  });
}

function readNumber(element) {
  const match = element.textContent.trim().match(NUMBER_IN_TEXT);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  return {
    prefix,
    suffix,
    value: Number(digits.replace(/,/g, '')),
    decimals: (digits.split('.')[1] || '').length,
    commas: digits.includes(','),
  };
}

function startValue(element, parts) {
  if (element.dataset.counterFrom) return Number(element.dataset.counterFrom);
  const isYear = !parts.prefix && !parts.suffix && parts.decimals === 0 && parts.value >= 1900 && parts.value <= 2100;
  return isYear ? parts.value - COUNTER.yearSpan : 0;
}

function format(value, { decimals, commas }) {
  const rounded = value.toFixed(decimals);
  if (!commas) return rounded;
  return Number(rounded).toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
