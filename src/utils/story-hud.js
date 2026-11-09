// Decorative layers the director controller animates. None of them hold copy, so they are made here
// instead of in the HTML (the chapter counter does hold copy and lives in index.html).
//
//   grade      inside the canvas holder, behind the WebGL canvas: the dark cold open and the sunrise
//   bars       letterbox bars, top and bottom
//   flash      flash frame (dip through black) for montage cuts
//   wipes      one panel per chapter wipe (made on demand)
//
// Everything is removed again by destroy().

export function createStoryHud(root) {
  const made = [];
  const canvasHolder = root.querySelector('[data-kef-canvas]') || root;

  const grade = makeElement('kef-grade', canvasHolder, true);
  const dark = makeElement('kef-grade__dark', grade);
  const sun = makeElement('kef-grade__sun', grade);
  const sweep = makeElement('kef-grade__sweep', grade);
  const bars = [makeElement('kef-bar kef-bar--top', root), makeElement('kef-bar kef-bar--bottom', root)];
  const flash = makeElement('kef-flash', root);

  function makeElement(className, parent, atStart = false) {
    const element = document.createElement('div');
    element.className = className;
    element.setAttribute('aria-hidden', 'true');
    if (atStart) parent.prepend(element);
    else parent.appendChild(element);
    if (parent === root || parent === canvasHolder) made.push(element);
    return element;
  }

  function addWipe() {
    return makeElement('kef-wipe', root);
  }

  function destroy() {
    made.forEach((element) => element.remove());
    made.length = 0;
  }

  return { grade: { dark, sun, sweep }, bars, flash, addWipe, destroy };
}
