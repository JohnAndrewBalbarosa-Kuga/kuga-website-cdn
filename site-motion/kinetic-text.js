// [data-kinetic="words" | "letters"]: the headline rises out of a mask word by word (or letter by
// letter) with GSAP SplitText. autoSplit re-splits after the web font loads or the width changes,
// and the tween picks up where it was. Reduced motion: the headline fades in.

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { KINETIC } from './config.js';

export function setupKineticText(mode, extraDelay = 0) {
  document.querySelectorAll('[data-kinetic]').forEach((element) => {
    const delay = KINETIC.delay + extraDelay;
    if (mode.reduced) {
      gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration: KINETIC.duration, delay });
      return;
    }
    const byLetter = element.dataset.kinetic === 'letters';
    gsap.set(element, { opacity: 1 });
    SplitText.create(element, {
      type: byLetter ? 'words,chars' : 'words',
      mask: byLetter ? 'chars' : 'words',
      wordsClass: 'word',
      charsClass: 'char',
      autoSplit: true,
      onSplit: (split) => gsap.from(byLetter ? split.chars : split.words, {
        yPercent: 110,
        duration: KINETIC.duration,
        stagger: byLetter ? KINETIC.stagger / 3 : KINETIC.stagger,
        ease: KINETIC.ease,
        delay,
      }),
    });
  });
}
